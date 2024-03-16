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
import { getTxLastestByTelegramId } from "../../../services/tx-lastest";
import { limitTimeEachRequest } from "../../../configs/constants";
import { SimulateBuyToken } from "../../../services/simulate-orders";

export async function simulateBuyPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter((wallet) => accountNames.find((a) => a.smartAccount === wallet) !== undefined);

    try {
        const msg = `⚙️ Simulate Buy
${await getTextForTradingPanel(tokenBase64, true)}
    `;

        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64), Markup.button.callback("🟢 Simulate", `Buy:${tokenBase64}`)],
            [Markup.button.callback("🛒 Buy with", "Nothing")],
            ...chunk([...preset.manualBuy], 4).map((chunk) =>
                chunk.map((value) => {
                    return Markup.button.callback(`${value} ETH`, `ExecSimB:${value}:${tokenBase64}`);
                })
            ),
            [Markup.button.callback(`💵 Custom Amount`, `BXSi:${tokenBase64}`)],
            [Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)],
            [Markup.button.callback("🛍️ Sell", `SiS:${tokenBase64}`), Markup.button.callback("📉 Buy Limit", `Buy Limit:${tokenBase64}`), Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`)],
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
export function onSimulateBuy(bot: Telegraf<BotContext>) {
    bot.action(/SiB:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        settings.tradingMode = TradingMode.SIMULATE_BUY;
        setTradingSettings(ctx, tokenBase64, settings);
        const { msg, inlineKeyboard } = await simulateBuyPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

export function simulateBuyXETH(bot: Telegraf<BotContext>) {
    bot.action(/BXSi:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const msg = `⚡ Simulate Buy X ETH

⚠️ When you send the value the buy will trigger
💡 Enter ETH Value in format "0.00"
`;
        const buyXETHMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        handleNewMessageKey(ctx, buyXETHMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:simulateBuyXETH`);
    });
}

export function onExecSimulateBuy(bot: Telegraf<BotContext>) {
    bot.action(/ExecSimB:.+/, (ctx) => {
        //@ts-ignore
        const [value, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        handleSimulateBuyXETH(ctx, tokenBase64, value);
    });
}

export async function handleSimulateBuyXETH(ctx: BotContext, tokenBase64: string, userInput: string) {
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

    const { msg } = await SimulateBuyToken(ctx, smartAccountsOwner, settings.participatingWallets, base64ToHex(tokenBase64), ethAmount, slippage / 100);

    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
