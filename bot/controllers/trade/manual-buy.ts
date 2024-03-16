import { Markup, Telegraf } from "telegraf";
import { BotContext, TRADING_MSG_KEY_PREFIX } from "../..";
import { closeButton, edit, getTelegramIdFromContext, handleNewMessageKey, inputEnquiry, processNumericInput, reply, safeDeleteMessage } from "../../helper";
import { backToTokensButton, participatingWallets, readBalancesButton, refreshDataButton } from ".";
import { getTradingSettingsFromBotSession, setTradingSettings } from "../../session/trading-settings";
import { TradingMode, TradingSettings } from "../../../types/trading-settings";
import { base64ToHex, checkTimePassed, chunk } from "../../utils";
import { getPresetFromBotSession } from "../../session/preset";
import { getTextForTradingPanel } from "../../../services/trading-data";
import { getAllNamesFromCtx } from "../../../services/account-name";
import { buyToken, preApprove } from "../../../services/manual-orders";
import { handleUnconnectedUser } from "../unconnected";
import { getSmartAccountsOwner } from "../../../services/approval";
import { getSafetySettingsFromBotSession } from "../../session/safety-settings";
import { getIsPrivRelayerInUseFromBotSession } from "../../session/private-relayer-in-user";
import { getTxLastestFromBotSession } from "../../session/tx-lastest";
import { getTxLastestByTelegramId } from "../../../services/tx-lastest";
import { limitTimeEachRequest } from "../../../configs/constants";

export async function manualBuyPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter((wallet) => accountNames.find((a) => a.smartAccount === wallet) !== undefined);

    try {
        const msg = `⚙️ Manual Buy
${await getTextForTradingPanel(tokenBase64, true)}
    `;

        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64), Markup.button.callback("🔴 Simulate", `SiB:${tokenBase64}`)],
            [Markup.button.callback("🛒 Buy with", "Nothing")],
            ...chunk([...preset.manualBuy], 4).map((chunk) =>
                chunk.map((value) => {
                    return Markup.button.callback(`${value} ETH`, `ExecB:${value}:${tokenBase64}`);
                })
            ),
            [Markup.button.callback(`💵 Custom Amount`, `BX:${tokenBase64}`)],
            [Markup.button.callback("✔️ Pre Approve", `Pre Approve:${tokenBase64}`), Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)],
            [Markup.button.callback("🛍️ Sell", `Sell:${tokenBase64}`), Markup.button.callback("📉 Buy Limit", `Buy Limit:${tokenBase64}`), Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`)],
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
export function onManualBuy(bot: Telegraf<BotContext>) {
    bot.action(/Buy:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.slice(4);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        settings.tradingMode = TradingMode.MANUAL_BUY;
        setTradingSettings(ctx, tokenBase64, settings);

        const { msg, inlineKeyboard } = await manualBuyPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

export function buyXETH(bot: Telegraf<BotContext>) {
    bot.action(/BX:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const msg = `⚡ Buy X ETH

⚠️ When you send the value the buy will trigger
💡 Enter ETH Value in format "0.00"
`;
        const buyXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        handleNewMessageKey(ctx, buyXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:buyXETH`);
    });
}

export function onExecBuy(bot: Telegraf<BotContext>) {
    bot.action(/ExecB:.+/, (ctx) => {
        //@ts-ignore
        const [value, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        handleBuyXETH(ctx, tokenBase64, value);
    });
}

async function handlePreApprove(ctx: BotContext, tokenBase64: string, settings: TradingSettings) {
    const txLastest = await getTxLastestByTelegramId(getTelegramIdFromContext(ctx)!);
    if (txLastest != undefined && checkTimePassed(txLastest, limitTimeEachRequest) == false) {
        return reply(ctx, "🔴 Please wait until your previous transaction is done", Markup.inlineKeyboard([closeButton]));
    }

    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

    const usePrivRelayer = getIsPrivRelayerInUseFromBotSession(ctx);

    const { msg } = await preApprove(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), usePrivRelayer);
    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
export function onPreApprove(bot: Telegraf<BotContext>) {
    bot.action(/Pre Approve:.+/, (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        handlePreApprove(ctx, tokenBase64, settings);
    });
}

export async function handleBuyXETH(ctx: BotContext, tokenBase64: string, userInput: string) {
    const txLastest = await getTxLastestByTelegramId(getTelegramIdFromContext(ctx)!);
    if (txLastest != undefined && checkTimePassed(txLastest, limitTimeEachRequest) == false) {
        return reply(ctx, "🔴 Please wait until your previous transaction is done", Markup.inlineKeyboard([closeButton]));
    }

    const ethAmount = processNumericInput(userInput, false, 0, undefined, 18);
    if (!ethAmount) {
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

    const { msg } = await buyToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), ethAmount, slippage / 100, usePrivRelayer);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
