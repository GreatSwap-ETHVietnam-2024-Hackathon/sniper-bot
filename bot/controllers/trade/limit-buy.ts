import { Markup, Telegraf } from "telegraf";
import { BotContext, TRADING_MSG_KEY_PREFIX } from "../..";
import { closeButton, edit, getTelegramIdFromContext, handleNewMessageKey, inputEnquiry, processNumericInput, reply } from "../../helper";
import { backToTokensButton, participatingWallets, readBalancesButton, refreshDataButton } from ".";
import { getTradingSettingsFromBotSession, setTradingSettings } from "../../session/trading-settings";
import { LimitMeasure, TradingMode } from "../../../types/trading-settings";
import { getTextForTradingPanel } from "../../../services/trading-data";
import { getAllNamesFromCtx } from "../../../services/account-name";
import { handleUnconnectedUser } from "../unconnected";
import { chunk } from "../../utils";
import { getPresetFromBotSession } from "../../session/preset";
import { getSmartAccountsOwner } from "../../../services/approval";
import { getSafetySettingsFromBotSession } from "../../session/safety-settings";
import { addBuyLimitOrder, cancelBuyLimitOrder, displayBuyLimitOrders } from "../../../services/buy-limit-orders";

export async function buyLimitPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter((wallet) => accountNames.find((a) => a.smartAccount === wallet) !== undefined);

    try {
        const msg = `⚙️ Buy Limit Order 
${await getTextForTradingPanel(tokenBase64, true)}
    `;
        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64)],
            [Markup.button.callback(`💰 ETH Spend: ${settings.buyLimitSettings.ethSpend} ETH`, `ETH Spend:${tokenBase64}`)],
            [Markup.button.callback(`⏳ Active: ${settings.buyLimitSettings.active}H`, `BL Active Duration:${tokenBase64}`), Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)],
            measures(tokenBase64, settings.buyLimitSettings.measure),
            ...chunk([...preset.buyLimit, "-X"], 2).map((chunk) =>
                chunk.map((value) => {
                    return Markup.button.callback(`📉 ${value}%`, value === "-X" ? `CustomizeBLPercent:${tokenBase64}` : `BL:${value}:${tokenBase64}`);
                })
            ),
            [Markup.button.callback("⚙️ Buy Limit Order Overview", `Buy Limit Order Overview:${tokenBase64}`)],
            [Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`), Markup.button.callback("🛒 Buy", `Buy:${tokenBase64}`), Markup.button.callback("🛍️ Sell", `Sell:${tokenBase64}`)],
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

export function measures(tokenBase64: string, measure: LimitMeasure) {
    const measuredByPrice = measure === LimitMeasure.TOKEN_PRICE;
    return [
        measuredByPrice ? Markup.button.callback(`💫 Custom Price`, `Customize BL Measure:${tokenBase64}`) : Markup.button.callback(`💫 Custom Market Cap`, `Customize BL Measure:${tokenBase64}`),
        Markup.button.callback(`↔️ ${measuredByPrice ? "Price" : "Market Cap"}`, `Toggle BL Measure:${tokenBase64}`),
    ];
}

async function displayBuyLimitOrderOverview(ctx: BotContext, refresh: boolean = false) {
    //@ts-ignore
    const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

    const { text, ids } = await displayBuyLimitOrders(getTelegramIdFromContext(ctx)!, smartAccountsOwner, tokenBase64);

    const msg = `📉 Buy Limit Order Overview
${text}
`;

    const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("♻️ Refresh", `RefreshBLO:${tokenBase64}`)], ...ids.map((id, index) => [Markup.button.callback(`Cancel Buy Limit Order #${index + 1}`, `CancelBLO:${id}`)]), [closeButton]]);

    if (!refresh) reply(ctx, msg, inlineKeyboard, ctx.callbackQuery!.message!.message_id);
    else edit(ctx, msg, inlineKeyboard);
}

export function onExecuteBuyLimit(bot: Telegraf<BotContext>) {
    bot.action(/BL:.+/, async (ctx) => {
        //@ts-ignore
        const [changingPercent, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        await createBuyLimitOrder(ctx, tokenBase64, undefined, parseFloat(changingPercent));
    });
}

export function buyLimitOrderOverview(bot: Telegraf<BotContext>) {
    bot.action(/Buy Limit Order Overview:.+/, async (ctx) => {
        await displayBuyLimitOrderOverview(ctx);
    });
    bot.action(/RefreshBLO:.+/, async (ctx) => {
        await displayBuyLimitOrderOverview(ctx, true);
    });
    bot.action(/CancelBLO:.+/, async (ctx) => {
        //@ts-ignore
        const _id = ctx.callbackQuery.data.split(":")[1];
        const text = await cancelBuyLimitOrder(_id);
        edit(ctx, text, Markup.inlineKeyboard([closeButton]));
    });
}

export function onBuyLimit(bot: Telegraf<BotContext>) {
    bot.action(/Buy Limit:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        settings.tradingMode = TradingMode.BUY_LIMIT;
        setTradingSettings(ctx, tokenBase64, settings);

        const { msg, inlineKeyboard } = await buyLimitPanel(ctx, tokenBase64);

        edit(ctx, msg, inlineKeyboard);
    });
}

export function setBLActiveDuration(bot: Telegraf<BotContext>) {
    bot.action(/BL Active Duration:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⏳ Set Active Duration

📈 Current value: ${settings.buyLimitSettings.active}H
💡 Enter Hour Value in format "0.00"
`;
        const ethSpendMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);

        handleNewMessageKey(ctx, ethSpendMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:BLActiveDuration`);
    });
}
export function setETHSpend(bot: Telegraf<BotContext>) {
    bot.action(/ETH Spend:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const msg = `⚡ ETH Spend

📈 Current value: ${settings.buyLimitSettings.ethSpend}ETH
💡 Enter ETH Value in format "0.00"
`;
        const ethSpendMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);

        handleNewMessageKey(ctx, ethSpendMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:ethSpend`);
    });
}
export async function handleSetETHSpend(ctx: BotContext, tokenBase64: string, userInput: string) {
    const ethSpend = processNumericInput(userInput, false, 0, undefined, 18);
    if (!ethSpend) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const oldETHSpend = settings.buyLimitSettings.ethSpend;
    settings.buyLimitSettings.ethSpend = ethSpend;
    const text = `🟢 *ETH Spend Set*

Previous value: ${oldETHSpend} ETH
New value: ${ethSpend} ETH
`;

    reply(ctx, text, Markup.inlineKeyboard([closeButton]));
    const { msg, inlineKeyboard } = await buyLimitPanel(ctx, tokenBase64);
    edit(ctx, msg, inlineKeyboard, settings.messageId);

    setTradingSettings(ctx, tokenBase64, settings);
}

export function customizeBLPercent(bot: Telegraf<BotContext>) {
    bot.action(/CustomizeBLPercent:.+/, async (ctx) => {
        //@ts-ignore
        const token = ctx.callbackQuery.data.split(":")[1];
        const msg = `💎 Custom Decreasing Percent

💡 Enter Decreasing Percent in format “-0.00”
       
`;
        const buyLimitCustomPercentMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        handleNewMessageKey(ctx, buyLimitCustomPercentMessageId, `${TRADING_MSG_KEY_PREFIX}${token}:customizeBLPercent`);
    });
}

export async function handleCustomizeBLPercent(ctx: BotContext, tokenBase64: string, userInput: string) {
    const changingPercent = processNumericInput(userInput, false, -100, -0.000001, 4);
    if (!changingPercent) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }
    await createBuyLimitOrder(ctx, tokenBase64, undefined, changingPercent);
}

export function customizeBLMeasure(bot: Telegraf<BotContext>) {
    bot.action(/Customize BL Measure:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        const msg = `💎 Custom ${settings.buyLimitSettings.measure === LimitMeasure.MARKET_CAP ? "Market Cap" : "Token Price"}

💡 Enter USD Value in format “0”
       
`;
        const buyLimitCustomMeasureMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        handleNewMessageKey(ctx, buyLimitCustomMeasureMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:customizeBLMeasure`);
    });
}

export async function handleCustomizeBLMeasure(ctx: BotContext, tokenBase64: string, userInput: string) {
    const customValue = processNumericInput(userInput, false, 0, undefined, 18);
    if (!customValue) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }
    await createBuyLimitOrder(ctx, tokenBase64, customValue);
}

export async function handleSetBLActiveDuration(ctx: BotContext, tokenBase64: string, userInput: string) {
    const activeDuration = processNumericInput(userInput, false, 0, undefined, 4);
    if (!activeDuration) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const oldActiveDuration = settings.buyLimitSettings.active;
    settings.buyLimitSettings.active = activeDuration;
    const text = `🟢 *Active Duration Set*

Previous value: ${oldActiveDuration} H
New value: ${activeDuration} H
`;

    reply(ctx, text, Markup.inlineKeyboard([closeButton]));
    const { msg, inlineKeyboard } = await buyLimitPanel(ctx, tokenBase64);
    edit(ctx, msg, inlineKeyboard, settings.messageId);
    setTradingSettings(ctx, tokenBase64, settings);
}
export function toggleBLMeasure(bot: Telegraf<BotContext>) {
    bot.action(/Toggle BL Measure:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        settings.buyLimitSettings.measure = settings.buyLimitSettings.measure === LimitMeasure.MARKET_CAP ? LimitMeasure.TOKEN_PRICE : LimitMeasure.MARKET_CAP;

        setTradingSettings(ctx, tokenBase64, settings);
        const { msg, inlineKeyboard } = await buyLimitPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}
async function createBuyLimitOrder(ctx: BotContext, tokenBase64: string, customValue?: number, changingPercent?: number) {
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);

    const text = await addBuyLimitOrder(
        getTelegramIdFromContext(ctx)!,
        smartAccountsOwner,
        tokenBase64,
        settings.buyLimitSettings.ethSpend,
        settings.buyLimitSettings.active,
        settings.slippage ?? safety.slippage,
        settings.participatingWallets,
        settings.buyLimitSettings.measure === LimitMeasure.TOKEN_PRICE,
        customValue,
        changingPercent
    );
    reply(ctx, text, Markup.inlineKeyboard([closeButton]));
}
