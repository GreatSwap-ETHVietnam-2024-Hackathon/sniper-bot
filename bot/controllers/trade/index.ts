import { Markup, Telegraf } from "telegraf";
import { BotContext, TRADING_MSG_KEY_PREFIX } from "../..";
import {
    backToMainMenuButton,
    closeButton,
    edit,
    getTelegramIdFromContext,
    handleNewMessageKey,
    inputEnquiry,
    processNumericInput,
    reply,
    safeDeleteMessage,
} from "../../helper";
import { base64ToHex, chunk, displayName, hexToBase64 } from "../../utils";
import { getTradingSettingsFromBotSession, setTradingSettings } from "../../session/trading-settings";
import { TradingMode } from "../../../types/trading-settings";
import { buyXETH, handleBuyXETH, manualBuyPanel, onExecBuy, onManualBuy, onPreApprove } from "./manual-buy";
import { manualSellPanel, onExecSell, onManualSell, sellXToken, sellXPercent, handleSellXP, handleSellXT } from "./manual-sell";
import {
    buyLimitOrderOverview,
    buyLimitPanel,
    customizeBLMeasure,
    customizeBLPercent,
    handleCustomizeBLMeasure,
    handleCustomizeBLPercent,
    handleSetBLActiveDuration,
    handleSetETHSpend,
    onBuyLimit,
    onExecuteBuyLimit,
    setBLActiveDuration,
    setETHSpend,
    toggleBLMeasure,
} from "./limit-buy";
import {
    customizeSLMeasure,
    customizeSLPercent,
    handleCustomizeSLMeasure,
    handleCustomizeSLPercent,
    handleSetSLActiveDuration,
    handleSetSpendingAmount,
    handleSetSpendingPercent,
    onExecuteSellLimit,
    onSellLimit,
    sellLimitOrderOverview,
    sellLimitPanel,
    setSLActiveDuration,
    setTokenSpend,
    toggleSLMeasure,
} from "./limit-sell";
import { getAllTradableTokens, getSmartAccounts, getSmartAccountsOwner } from "../../../services/approval";
import { getTokenConfig, getTokenConfigList } from "../../../services/token-config";
import { getNames } from "../../../services/account-name";
import { AccountName } from "../../../types/account-name";
import { fetchBalances } from "../../../services/balance";
import { handleUnconnectedUser } from "../unconnected";
import { getETHPrice, getMarketInfo } from "../../../services/trading-data";
import BigNumber from "bignumber.js";
import { getSafetySettingsFromBotSession } from "../../session/safety-settings";
import { handleSimulateBuyXETH, onExecSimulateBuy, onSimulateBuy, simulateBuyPanel, simulateBuyXETH } from "./simulate-buy";
import { handleSimulateSellXP, handleSimulateSellXT, simulateSellPanel } from "./simulate-sell";
import { onSimulateSell } from "./simulate-sell";
import { simulateSellXPercent } from "./simulate-sell";
import { simulateSellXToken } from "./simulate-sell";
import { onExecSimulateSell } from "./simulate-sell";

export async function tradingPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    switch (settings.tradingMode) {
        case TradingMode.MANUAL_BUY:
            return await manualBuyPanel(ctx, tokenBase64);
        case TradingMode.MANUAL_SELL:
            return await manualSellPanel(ctx, tokenBase64);
        case TradingMode.SIMULATE_BUY:
            return await simulateBuyPanel(ctx, tokenBase64);
        case TradingMode.SIMULATE_SELL:
            return await simulateSellPanel(ctx, tokenBase64);
        case TradingMode.BUY_LIMIT:
            return await buyLimitPanel(ctx, tokenBase64);
        case TradingMode.SELL_LIMIT:
            return await sellLimitPanel(ctx, tokenBase64);
    }
}

export async function chooseToken(ctx: BotContext, isCommand?: boolean, isBack?: boolean) {
    try {
        const telegramId = getTelegramIdFromContext(ctx);
        const tokens = await getAllTradableTokens(telegramId!);
        const configs = await getTokenConfigList(tokens);

        let msg;
        let inlineKeyboard;
        if (tokens.length === 0) {
            msg = `⚜️ There is no whitelisted token to trade. Please go to Great Swap Station to whitelist some.`;
            inlineKeyboard = Markup.inlineKeyboard([
                [Markup.button.url(`Go to Great Swap Station`, `${process.env.STATION_URL}bot-settings/${telegramId}`)],
                [backToMainMenuButton, closeButton],
            ]);
        } else {
            msg = `⚜️ Choose a whitelisted token:`;
            const tokenChunks = chunk(configs, 4);

            inlineKeyboard = Markup.inlineKeyboard([
                ...tokenChunks.map((c) =>
                    c.map((config) => Markup.button.callback(config.symbol, `Open Trade:${hexToBase64(config.address)}`))
                ),
                [backToMainMenuButton, closeButton],
            ]);
        }

        if (isBack) reply(ctx, msg, inlineKeyboard);
        else if (isCommand) {
            reply(ctx, msg, inlineKeyboard);
            safeDeleteMessage(ctx);
        } else {
            edit(ctx, msg, inlineKeyboard);
        }
    } catch (err) {}
}

export const backToTokensButton = Markup.button.callback("< Back", "back to tokens");
export const refreshDataButton = (tokenBase64: string) => Markup.button.callback("♻️ Refresh", `RefreshData:${tokenBase64}`);
export const readBalancesButton = (tokenBase64: string) => Markup.button.callback("🪙 Read balances", `Balance:${tokenBase64}`);

function onBackToChoosingToken(bot: Telegraf<BotContext>) {
    bot.action("back to tokens", (ctx) => {
        chooseToken(ctx, false, true);
    });
}
function openTrade(bot: Telegraf<BotContext>) {
    bot.action(/Open Trade:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

        const { msg, inlineKeyboard } = await tradingPanel(ctx, tokenBase64);

        let currentMsgId = ctx.callbackQuery.message!.message_id;

        let msgId;

        if (ctx.session?.lastMessageId && currentMsgId < ctx.session.lastMessageId) {
            msgId = await reply(ctx, msg, inlineKeyboard);
        } else {
            msgId = await edit(ctx, msg, inlineKeyboard);
        }

        if (settings.messageId && settings.messageId !== currentMsgId) {
            await safeDeleteMessage(ctx, settings.messageId);
        }
        if (msgId) {
            settings.messageId = msgId;
            setTradingSettings(ctx, tokenBase64, settings);
            ctx.pinChatMessage(msgId);
        }
    });
}

async function balanceModal(ctx: BotContext, refresh: boolean = false) {
    try {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const token = base64ToHex(tokenBase64);

        const config = await getTokenConfig(token);

        const ethPrice = await getETHPrice();
        const tokenPrice = (await getMarketInfo(token)).priceUSDC;

        const smartAccountsOwner = await getSmartAccountsOwner(ctx);
        const smartAccounts = await getSmartAccounts(ctx);
        if (!smartAccountsOwner || !smartAccounts) return handleUnconnectedUser(ctx);

        const balances = await fetchBalances(getTelegramIdFromContext(ctx)!, token, smartAccounts, config);
        const accountNames = await getNames(smartAccountsOwner, smartAccounts);
        const msg = `💎 *ETH - ${config.symbol} Balance*
${accountNames.map((accountName, index) => {
    const name = displayName(accountName.name ?? accountName.smartAccount, 10, 5);
    const ethBalance = new BigNumber(balances[index].ethBalance).toFixed(6);
    const wethBalance = new BigNumber(balances[index].wethBalance).toFixed(6);
    const tokenBalance = new BigNumber(balances[index].tokenBalance).toFixed(6);
    const ethInUSD = new BigNumber(balances[index].ethBalance).multipliedBy(ethPrice).toFixed(2);
    const wethInUSD = new BigNumber(balances[index].wethBalance).multipliedBy(ethPrice).toFixed(2);
    const tokenInUSD = new BigNumber(balances[index].tokenBalance).multipliedBy(tokenPrice).toFixed(2);
    return `\n🏛 #Wallet ${name}:\n*${ethBalance} ETH ($${ethInUSD})*\n*${wethBalance} WETH ($${wethInUSD})*\n*${tokenBalance} ${
        config.symbol
    } ($${tokenInUSD})*  ${Number(ethBalance) == 0 ? "\n_Should deposit ETH to pay tx fee for this wallet_" : ""} \n`;
})}
`;

        const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("♻️ Refresh", `RefreshBal:${tokenBase64}`)], [closeButton]]);

        if (!refresh) reply(ctx, msg, inlineKeyboard, ctx.callbackQuery!.message!.message_id);
        else edit(ctx, msg, inlineKeyboard);
    } catch (err) {
        reply(ctx, "🔴 Operation failed for an unexpected reason");
    }
}
function watchBalance(bot: Telegraf<BotContext>) {
    bot.action(/Balance:.+/, (ctx) => {
        balanceModal(ctx);
    });

    bot.action(/RefreshBal:.+/, (ctx) => {
        balanceModal(ctx, true);
    });
}

function toggleParticipatingWallet(bot: Telegraf<BotContext>) {
    bot.action(/TPW:.+/, async (ctx) => {
        //@ts-ignore
        const [accountBase64, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1);
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const smartAccount = base64ToHex(accountBase64);

        const index = settings.participatingWallets.indexOf(smartAccount);
        if (index === -1) settings.participatingWallets.push(smartAccount);
        else settings.participatingWallets.splice(index, 1);

        setTradingSettings(ctx, tokenBase64, settings);

        const { msg, inlineKeyboard } = await tradingPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

function handleRefreshData(bot: Telegraf<BotContext>) {
    bot.action(/RefreshData:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const { msg, inlineKeyboard } = await tradingPanel(ctx, tokenBase64);
        edit(ctx, msg, inlineKeyboard);
    });
}

function setSlippage(bot: Telegraf<BotContext>) {
    bot.action(/Set slippage:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const safety = getSafetySettingsFromBotSession(ctx);
        const msg = `⚡ Slippage

📈 Current value: ${settings.slippage ?? safety.slippage}%
💡 Enter Value in format "0"
`;
        const slippageMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id);
        handleNewMessageKey(ctx, slippageMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:slippage`);
    });
}

export function participatingWallets(tokenBase64: string, participatingWallets: string[], accountNames: AccountName[]) {
    const chunkSize = 3;
    const chunks = chunk(accountNames, chunkSize);
    return chunks.map((chunk) =>
        chunk.map((accountName) => {
            const accountBase64 = hexToBase64(accountName.smartAccount);
            const active = participatingWallets.includes(accountName.smartAccount);
            return Markup.button.callback(
                `${active ? "🟢 " : "🔴 "}${accountName.name ?? accountName.smartAccount}`,
                `TPW:${accountBase64}:${tokenBase64}`
            );
        })
    );
}

async function handleSetSlippage(ctx: BotContext, tokenBase64: string, userInput: string) {
    const slippage = processNumericInput(userInput, false, 0, 99.9, 4);
    if (!slippage) {
        const errText = `*⚠︎ Invalid input*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const oldSlippage = settings.slippage ?? safety.slippage;
    settings.slippage = slippage;
    const text = `🟢 *Slippage Set*

Previous value: ${oldSlippage}%
New value: ${slippage}%
`;

    reply(ctx, text, Markup.inlineKeyboard([closeButton]));
    const { msg, inlineKeyboard } = await tradingPanel(ctx, tokenBase64);
    edit(ctx, msg, inlineKeyboard, settings.messageId);
    setTradingSettings(ctx, tokenBase64, settings);
}

export async function handleUserInputs(ctx: BotContext, msgId: number, msgKey: string, userInput: string) {
    const [tokenBase64, functionName] = msgKey.split(":");

    const handleFncs: { [key: string]: (ctx: BotContext, tokenBase64: string, userInput: string) => Promise<number | undefined | void> } = {
        slippage: handleSetSlippage,
        ethSpend: handleSetETHSpend,
        BLActiveDuration: handleSetBLActiveDuration,
        SLActiveDuration: handleSetSLActiveDuration,
        ChangeSLPercent: handleSetSpendingPercent,
        ChangeSLAmount: handleSetSpendingAmount,
        buyXETH: handleBuyXETH,
        SXT: handleSellXT,
        SXP: handleSellXP,
        simulateBuyXETH: handleSimulateBuyXETH,
        simulateSellXToken: handleSimulateSellXT,
        simulateSellXPercent: handleSimulateSellXP,
        customizeBLPercent: handleCustomizeBLPercent,
        customizeSLPercent: handleCustomizeSLPercent,
        customizeBLMeasure: handleCustomizeBLMeasure,
        customizeSLMeasure: handleCustomizeSLMeasure,
    };

    const handleFnc = handleFncs[functionName];
    if (handleFnc) {
        safeDeleteMessage(ctx, msgId);
        handleFnc(ctx, tokenBase64, userInput);
    }
}

export default function buildTradingFunctions(bot: Telegraf<BotContext>) {
    openTrade(bot);
    handleRefreshData(bot);
    watchBalance(bot);
    onManualBuy(bot);
    onManualSell(bot);
    onBuyLimit(bot);
    onSellLimit(bot);
    onExecuteBuyLimit(bot);
    onExecuteSellLimit(bot);
    toggleParticipatingWallet(bot);
    toggleBLMeasure(bot);
    toggleSLMeasure(bot);
    setBLActiveDuration(bot);
    setSLActiveDuration(bot);
    setSlippage(bot);
    setETHSpend(bot);
    setTokenSpend(bot);
    buyXETH(bot);
    onExecBuy(bot);
    onExecSell(bot);
    sellXPercent(bot);
    sellXToken(bot);
    onPreApprove(bot);
    onSimulateBuy(bot);
    simulateBuyXETH(bot);
    onExecSimulateBuy(bot);
    onSimulateSell(bot);
    simulateSellXPercent(bot);
    simulateSellXToken(bot);
    onExecSimulateSell(bot);
    customizeBLPercent(bot);
    customizeSLPercent(bot);
    customizeBLMeasure(bot);
    customizeSLMeasure(bot);
    buyLimitOrderOverview(bot);
    sellLimitOrderOverview(bot);
    onBackToChoosingToken(bot);
}
