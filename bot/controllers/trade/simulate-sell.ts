import { Markup, Telegraf } from "telegraf";
import { closeButton, edit, getTelegramIdFromContext, handleNewMessageKey, inputEnquiry, processNumericInput, reply } from "../../helper";
import { BotContext, TRADING_MSG_KEY_PREFIX } from "../..";
import { backToTokensButton, readBalancesButton, refreshDataButton, participatingWallets } from ".";
import { getTradingSettingsFromBotSession, setTradingSettings } from "../../session/trading-settings";
import { TradingMode } from "../../../types/trading-settings";
import { base64ToHex, checkTimePassed, chunk } from "../../utils";
import { getPresetFromBotSession } from "../../session/preset";
import { getTextForTradingPanel } from "../../../services/trading-data";
import { getAllNamesFromCtx } from "../../../services/account-name";
import { buyToken, sellToken } from "../../../services/manual-orders";
import { handleUnconnectedUser } from "../unconnected";
import { getSmartAccountsOwner } from "../../../services/approval";
import { getSafetySettingsFromBotSession } from "../../session/safety-settings";
import { getTokenConfig } from "../../../services/token-config";
import { getIsPrivRelayerInUseFromBotSession } from "../../session/private-relayer-in-user";
import { getTxLastestByTelegramId } from "../../../services/tx-lastest";
import { limitTimeEachRequest } from "../../../configs/constants";
import { SimulateSellToken } from "../../../services/simulate-orders";

export async function simulateSellPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter((wallet) => accountNames.find((a) => a.smartAccount === wallet) !== undefined);

    try {
        const msg = `⚙️ Simulate Sell
${await getTextForTradingPanel(tokenBase64, false)}
    `;
        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64), Markup.button.callback("🟢 Simulate", `Sell:${tokenBase64}`)],
            [Markup.button.callback("🛍️ Sell", "Nothing")],
            ...chunk(preset.manualSell, 4).map((chunk) =>
                chunk.map((value) => {
                    return Markup.button.callback(`${value}%`, `ExecSimS:${value}:${tokenBase64}`);
                })
            ),
            [Markup.button.callback("Sell X%", `SXPSi:${tokenBase64}`), Markup.button.callback("Sell X Token", `SXTSi:${tokenBase64}`)],
            [Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)],
            [Markup.button.callback("🛒 Buy", `SiB:${tokenBase64}`), Markup.button.callback("📉 Buy Limit", `Buy Limit:${tokenBase64}`), Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`)],
            [backToTokensButton, closeButton],
        ]);
        return { msg, inlineKeyboard };
    } catch (err) {
        return {
            msg: `🔴 No market data found for this token`,
            inlineKeyboard: Markup.inlineKeyboard([[backToTokensButton, closeButton]]),
        };
    }
}

export function onSimulateSell(bot: Telegraf<BotContext>) {
    bot.action(/SiS:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        settings.tradingMode = TradingMode.MANUAL_SELL;
        setTradingSettings(ctx, tokenBase64, settings);

        const { msg, inlineKeyboard } = await simulateSellPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

export function onExecSimulateSell(bot: Telegraf<BotContext>) {
    bot.action(/ExecSimS:.+/, async (ctx) => {
        //@ts-ignore
        const [percent, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        handleSimulateSellXP(ctx, tokenBase64, percent);
    });
}

export function simulateSellXToken(bot: Telegraf<BotContext>) {
    bot.action(/SXTSi:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const token = base64ToHex(tokenBase64);
        const config = await getTokenConfig(token);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⚡Simulate Sell X ${config.symbol}

⚠️ When you send the value the sell will trigger
💡 Enter ${config.symbol} Value in format "0.00"

`;
        const sellXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        setTradingSettings(ctx, tokenBase64, settings);
        handleNewMessageKey(ctx, sellXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:simulateSellXToken`);
    });
}

export function simulateSellXPercent(bot: Telegraf<BotContext>) {
    bot.action(/SXPSi:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const token = base64ToHex(tokenBase64);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⚡ Simulate Sell X%

⚠️ When you send the value the sell will trigger
💡 Enter Percent Value in format "0.00"

`;
        const sellXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        setTradingSettings(ctx, tokenBase64, settings);
        handleNewMessageKey(ctx, sellXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:simulateSellXPercent`);
    });
}

export async function handleSimulateSellXP(ctx: BotContext, tokenBase64: string, userInput: string) {
    const txLastest = await getTxLastestByTelegramId(getTelegramIdFromContext(ctx)!);
    if (txLastest != undefined && checkTimePassed(txLastest, limitTimeEachRequest) == false) {
        return reply(ctx, "🔴 Please wait until your previous transaction is done", Markup.inlineKeyboard([closeButton]));
    }

    const percent = processNumericInput(userInput, false, 0, 100, 4);
    if (!percent) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }

    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const slippage = settings.slippage ?? safety.slippage;

    const { msg } = await SimulateSellToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), slippage / 100, percent);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}

export async function handleSimulateSellXT(ctx: BotContext, tokenBase64: string, userInput: string) {
    const txLastest = await getTxLastestByTelegramId(getTelegramIdFromContext(ctx)!);
    if (txLastest != undefined && checkTimePassed(txLastest, limitTimeEachRequest) == false) {
        return reply(ctx, "🔴 Please wait until your previous transaction is done", Markup.inlineKeyboard([closeButton]));
    }

    const tokenAmount = processNumericInput(userInput, false, 0, undefined, 18);
    if (!tokenAmount) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }

    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);


    const slippage = settings.slippage ?? safety.slippage;

    const { msg } = await SimulateSellToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), slippage / 100, undefined, tokenAmount);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
