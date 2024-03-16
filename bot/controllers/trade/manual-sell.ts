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
import { sellToken } from "../../../services/manual-orders";
import { handleUnconnectedUser } from "../unconnected";
import { getSmartAccountsOwner } from "../../../services/approval";
import { getSafetySettingsFromBotSession } from "../../session/safety-settings";
import { getTokenConfig } from "../../../services/token-config";
import { getIsPrivRelayerInUseFromBotSession } from "../../session/private-relayer-in-user";
import { getTxLastestByTelegramId } from "../../../services/tx-lastest";
import { limitTimeEachRequest } from "../../../configs/constants";

export async function manualSellPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter((wallet) => accountNames.find((a) => a.smartAccount === wallet) !== undefined);

    try {
        const msg = `⚙️ Manual Sell
${await getTextForTradingPanel(tokenBase64, false)}
    `;
        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64), Markup.button.callback("🔴 Simulate", `SiS:${tokenBase64}`)],
            [Markup.button.callback("🛍️ Sell", "Nothing")],
            ...chunk(preset.manualSell, 4).map((chunk) =>
                chunk.map((value) => {
                    return Markup.button.callback(`${value}%`, `ExecS:${value}:${tokenBase64}`);
                })
            ),
            [Markup.button.callback("Sell X%", `SXP:${tokenBase64}`), Markup.button.callback("Sell X Token", `SXT:${tokenBase64}`)],
            [Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)],
            [Markup.button.callback("🛒 Buy", `Buy:${tokenBase64}`), Markup.button.callback("📉 Buy Limit", `Buy Limit:${tokenBase64}`), Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`)],
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

export function onManualSell(bot: Telegraf<BotContext>) {
    bot.action(/Sell:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.slice(5);

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        settings.tradingMode = TradingMode.MANUAL_SELL;
        setTradingSettings(ctx, tokenBase64, settings);

        const { msg, inlineKeyboard } = await manualSellPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

export function onExecSell(bot: Telegraf<BotContext>) {
    bot.action(/ExecS:.+/, async (ctx) => {
        //@ts-ignore
        const [percent, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        handleSellXP(ctx, tokenBase64, percent);
    });
}

export function sellXToken(bot: Telegraf<BotContext>) {
    bot.action(/SXT:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const token = base64ToHex(tokenBase64);
        const config = await getTokenConfig(token);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⚡ Sell X ${config.symbol}

⚠️ When you send the value the sell will trigger
💡 Enter ${config.symbol} Value in format "0.00"

`;
        const sellXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        setTradingSettings(ctx, tokenBase64, settings);
        handleNewMessageKey(ctx, sellXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:SXT`);
    });
}

export function sellXPercent(bot: Telegraf<BotContext>) {
    bot.action(/SXP:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const token = base64ToHex(tokenBase64);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⚡ Sell X%

⚠️ When you send the value the sell will trigger
💡 Enter Percent Value in format "0.00"

`;
        const sellXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        setTradingSettings(ctx, tokenBase64, settings);
        handleNewMessageKey(ctx, sellXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:SXP`);
    });
}

export async function handleSellXP(ctx: BotContext, tokenBase64: string, userInput: string) {
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

    const { msg } = await sellToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), slippage / 100, percent);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}

export async function handleSellXT(ctx: BotContext, tokenBase64: string, userInput: string) {
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
    const usePrivRelayer = getIsPrivRelayerInUseFromBotSession(ctx);

    const slippage = settings.slippage ?? safety.slippage;

    const { msg } = await sellToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), slippage / 100, undefined, tokenAmount, usePrivRelayer);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
