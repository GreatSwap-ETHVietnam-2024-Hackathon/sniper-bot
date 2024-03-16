import { Markup, Telegraf } from "telegraf"
import { BotContext, TRADING_MSG_KEY_PREFIX } from "../.."
import { closeButton, edit, errReply, getTelegramIdFromContext, handleNewMessageKey, inputEnquiry, processNumericInput, reply } from "../../helper"
import { backToTokensButton, readBalancesButton, refreshDataButton, participatingWallets } from "."
import { getTradingSettingsFromBotSession, setTradingSettings } from "../../session/trading-settings"
import { LimitMeasure, TradingMode } from "../../../types/trading-settings"
import { getTextForTradingPanel } from "../../../services/trading-data"
import { handleUnconnectedUser } from "../unconnected"
import { base64ToHex, chunk } from "../../utils"
import { getPresetFromBotSession } from "../../session/preset"
import { getSmartAccountsOwner } from "../../../services/approval"
import { getSafetySettingsFromBotSession } from "../../session/safety-settings"
import { addSellLimitOrder, cancelSellLimitOrder, displaySellLimitOrders } from "../../../services/sell-limit-orders"
import { getTokenConfig } from "../../../services/token-config"
import { getAllNamesFromCtx } from "../../../services/account-name"

export async function sellLimitPanel(ctx: BotContext, tokenBase64: string) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const token = base64ToHex(tokenBase64);
    const accountNames = await getAllNamesFromCtx(ctx);
    const config = await getTokenConfig(token)
    const sellLimitSettings = settings.sellLimitSettings
    const actualWallets = settings.participatingWallets.filter(wallet => accountNames.find(a => a.smartAccount === wallet) !== undefined)

    try {
        const msg = `⚙️ Sell Limit Order
${await getTextForTradingPanel(tokenBase64, false)}
    `
        const inlineKeyboard = Markup.inlineKeyboard([
            ...participatingWallets(tokenBase64, actualWallets, accountNames),
            [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64)],
            sellLimitSettings.isChoosingSpending ?
                [
                    Markup.button.callback('X %', `ChangeSLPercent:${tokenBase64}`),
                    Markup.button.callback(
                        `X ${config.symbol}`, `ChangeSLAmount:${tokenBase64}`),
                    Markup.button.callback('↩', `ChangingSLOff:${tokenBase64}`)
                ]
                : [
                    Markup.button.callback(
                        `💰 Sell: ${sellLimitSettings.spendByPercent ? `${sellLimitSettings.spendingPercent}%` : `${sellLimitSettings.spendingAmount} ${config.symbol}`}`,
                        `ChangingSLOn:${tokenBase64}`
                    )
                ],
            [
                Markup.button.callback(`⏳ Active: ${sellLimitSettings.active}H`, `SL Active Duration:${tokenBase64}`),
                Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)
            ],
            measures(tokenBase64, sellLimitSettings.measure),
            ...chunk([...preset.sellLimit, 'X'], 2).map((chunk) => chunk.map(
                (value) => {
                    if (value !== 'X')
                        return Markup.button.callback(`📈 ${Number(value) > 0 ? 'Take profit: +' : 'Stop loss: '}${value}%`, `SL:${value}:${tokenBase64}`)
                    else
                        return Markup.button.callback(`📈 X%`, `CustomizeSLPercent:${tokenBase64}`)
                }
            )),
            [Markup.button.callback("⚙️ Sell Limit Order Overview", `Sell Limit Order Overview:${tokenBase64}`)],
            [Markup.button.callback("📉 Buy Limit", `Buy Limit:${tokenBase64}`), Markup.button.callback("🛒 Buy", `Buy:${tokenBase64}`), Markup.button.callback("🛍️ Sell", `Sell:${tokenBase64}`)],
            [backToTokensButton, closeButton],
        ])
        return { msg, inlineKeyboard }
    } catch (err) {
        return {
            msg: `🔴 No market data found for this token`,
            inlineKeyboard: Markup.inlineKeyboard([
                [backToTokensButton, closeButton]
            ])
        }
    }
}

export function measures(tokenBase64: string, measure: LimitMeasure) {
    const measuredByPrice = measure === LimitMeasure.TOKEN_PRICE;
    return [measuredByPrice ?
        Markup.button.callback(`💫 Custom Price`, `Customize SL Measure:${tokenBase64}`) :
        Markup.button.callback(`💫 Custom Market Cap`, `Customize SL Measure:${tokenBase64}`),
    Markup.button.callback(`↔️ ${measuredByPrice ? 'Price' : 'Market Cap'}`, `Toggle SL Measure:${tokenBase64}`)
    ]
}

async function displaySellLimitOrderOverview(ctx: BotContext, refresh: boolean = false) {
    //@ts-ignore
    const tokenBase64 = ctx.callbackQuery.data.split(':')[1]
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);
    const { text, ids } = await displaySellLimitOrders(getTelegramIdFromContext(ctx)!, smartAccountsOwner, tokenBase64)
    const msg = `📈 Sell Limit Order Overview
${text}
`

    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("♻️ Refresh", `RefreshSLO:${tokenBase64}`)],
        ...ids.map((id, index) => [Markup.button.callback(`Cancel Sell Limit Order #${index + 1}`, `CancelSLO:${id}`)]),
        [closeButton]
    ])

    if (!refresh)
        reply(ctx, msg, inlineKeyboard, ctx.callbackQuery!.message!.message_id)
    else
        edit(ctx, msg, inlineKeyboard)
}

export function sellLimitOrderOverview(bot: Telegraf<BotContext>) {
    bot.action(/Sell Limit Order Overview:.+/, async (ctx) => {
        await displaySellLimitOrderOverview(ctx);
    })
    bot.action(/RefreshSLO:.+/, async (ctx) => {
        await displaySellLimitOrderOverview(ctx, true)
    })
    bot.action(/CancelSLO:.+/, async (ctx) => {
        //@ts-ignore
        const _id = ctx.callbackQuery.data.split(":")[1]
        const text = await cancelSellLimitOrder(_id)
        edit(ctx, text, Markup.inlineKeyboard([closeButton]))
    })
}

export function onExecuteSellLimit(bot: Telegraf<BotContext>) {
    bot.action(/SL:.+/, async (ctx) => {
        //@ts-ignore
        const [changingPercent, tokenBase64] = ctx.callbackQuery.data.split(":").slice(1)
        await createSellLimitOrder(ctx, tokenBase64, undefined, Number(changingPercent));
    })
}

export function onSellLimit(bot: Telegraf<BotContext>) {
    bot.action(/Sell Limit:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.slice(11)

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64)

        settings.tradingMode = TradingMode.SELL_LIMIT
        setTradingSettings(ctx, tokenBase64, settings)

        const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
        edit(ctx, msg, inlineKeyboard)
    })
}

export function setTokenSpend(bot: Telegraf<BotContext>) {
    bot.action(/ChangingSLOn:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        settings.sellLimitSettings.isChoosingSpending = true;
        setTradingSettings(ctx, tokenBase64, settings)

        const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
        edit(ctx, msg, inlineKeyboard, settings.messageId)
    })

    bot.action(/ChangingSLOff:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        settings.sellLimitSettings.isChoosingSpending = false;
        setTradingSettings(ctx, tokenBase64, settings)

        const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
        edit(ctx, msg, inlineKeyboard, settings.messageId)
    })

    bot.action(/ChangeSLAmount:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const token = base64ToHex(tokenBase64);
        const config = await getTokenConfig(token)
        const msg = `⚡ Set spending amount

💡 Enter ${config.symbol} Value in format "0.00"
`
        const tokenSpendMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id)

        handleNewMessageKey(ctx, tokenSpendMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:ChangeSLAmount`)
    })

    bot.action(/ChangeSLPercent:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const msg = `⚡ Set spending amount

💡 Enter % Value in format "0.00"
`
        const tokenSpendMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id)

        handleNewMessageKey(ctx, tokenSpendMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:ChangeSLPercent`)
    })
}

export function setSLActiveDuration(bot: Telegraf<BotContext>) {
    bot.action(/SL Active Duration:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64)
        const msg = `⏳ Set Active Duration

📈 Current value: ${settings.sellLimitSettings.active}H
💡 Enter Hour Value in format "0.00"
`
        const ethSpendMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id)

        handleNewMessageKey(ctx, ethSpendMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:SLActiveDuration`)
    })
}

export async function handleSetSpendingAmount(ctx: BotContext, tokenBase64: string, userInput: string) {
    const amount = processNumericInput(userInput, false, 0, undefined, 18)
    if (!amount) {
        const errText = `*⚠︎ Invalid input*`
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

    settings.sellLimitSettings = Object.assign(settings.sellLimitSettings, {
        isChoosingSpending: false,
        spendByPercent: false,
        spendingAmount: amount
    })

    setTradingSettings(ctx, tokenBase64, settings)
    const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
    edit(ctx, msg, inlineKeyboard, settings.messageId)
}

export async function handleSetSpendingPercent(ctx: BotContext, tokenBase64: string, userInput: string) {
    const percent = processNumericInput(userInput, false, 0.0001, 100, 4)
    if (!percent) {
        const errText = `*⚠︎ Invalid input*`
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);

    settings.sellLimitSettings = Object.assign(settings.sellLimitSettings, {
        isChoosingSpending: false,
        spendByPercent: true,
        spendingPercent: percent
    })

    setTradingSettings(ctx, tokenBase64, settings)
    const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
    edit(ctx, msg, inlineKeyboard, settings.messageId)
}


export function customizeSLPercent(bot: Telegraf<BotContext>) {
    bot.action(/CustomizeSLPercent:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const msg = `💎 Custom Percent

💡 Enter Percent in format “+/- 0.00”
       
`
        const sellLimitCustomPercentMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id)
        handleNewMessageKey(ctx, sellLimitCustomPercentMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:customizeSLPercent`)
    })
}

export async function handleCustomizeSLPercent(ctx: BotContext, tokenBase64: string, userInput: string) {
    const changingPercent = processNumericInput(userInput, false, undefined, undefined, 4);
    if (!changingPercent) {
        const errText = `*⚠︎ Invalid input*`
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
        return reply(ctx, errText, inlineKeyboard);
    }
    await createSellLimitOrder(ctx, tokenBase64, undefined, changingPercent)
}

export function customizeSLMeasure(bot: Telegraf<BotContext>) {
    bot.action(/Customize SL Measure:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1]
        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64)

        const msg = `💎 Custom ${settings.sellLimitSettings.measure === LimitMeasure.MARKET_CAP ? 'Market Cap' : 'Token Price'}

💡 Enter USD Value in format “0”
       
`
        const sellLimitCustomMeasureMessageId = await inputEnquiry(ctx, msg, ctx.callbackQuery.message!.message_id)
        setTradingSettings(ctx, tokenBase64, settings)
        handleNewMessageKey(ctx, sellLimitCustomMeasureMessageId, `${TRADING_MSG_KEY_PREFIX}${tokenBase64}:customizeSLMeasure`)
    })
}

export async function handleCustomizeSLMeasure(ctx: BotContext, tokenBase64: string, userInput: string) {
    const customValue = processNumericInput(userInput, false, 0, undefined, 18);
    if (!customValue) {
        const errText = `*⚠︎ Invalid input*`
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
        return reply(ctx, errText, inlineKeyboard);
    }
    await createSellLimitOrder(ctx, tokenBase64, customValue)
}

export async function handleSetSLActiveDuration(ctx: BotContext, tokenBase64: string, userInput: string) {
    const activeDuration = processNumericInput(userInput, false, 0, undefined, 4)
    if (!activeDuration) {
        const errText = `*⚠︎ Invalid input*`
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
        return reply(ctx, errText, inlineKeyboard);
    }
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const oldActiveDuration = settings.sellLimitSettings.active;
    settings.sellLimitSettings.active = activeDuration;
    const text = `🟢 *Active Duration Set*

Previous value: ${oldActiveDuration} H
New value: ${activeDuration} H
`

    reply(ctx, text, Markup.inlineKeyboard([closeButton]))
    const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
    edit(ctx, msg, inlineKeyboard, settings.messageId)
    setTradingSettings(ctx, tokenBase64, settings)
}

export function toggleSLMeasure(bot: Telegraf<BotContext>) {
    bot.action(/Toggle SL Measure:.+/, async (ctx) => {
        //@ts-ignore
        const tokenBase64 = ctx.callbackQuery.data.split(":")[1];

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64)

        settings.sellLimitSettings.measure = settings.sellLimitSettings.measure === LimitMeasure.MARKET_CAP ? LimitMeasure.TOKEN_PRICE : LimitMeasure.MARKET_CAP

        setTradingSettings(ctx, tokenBase64, settings)
        const { msg, inlineKeyboard } = await sellLimitPanel(ctx, tokenBase64)
        edit(ctx, msg, inlineKeyboard)

    })
}

async function createSellLimitOrder(ctx: BotContext, tokenBase64: string, customValue?: number, changingPercent?: number) {
    try {
        const smartAccountsOwner = await getSmartAccountsOwner(ctx);
        if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

        const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
        const safety = getSafetySettingsFromBotSession(ctx);

        const spendByPercent = settings.sellLimitSettings.spendByPercent;
        const text = await addSellLimitOrder(
            getTelegramIdFromContext(ctx)!,
            smartAccountsOwner,
            tokenBase64,
            settings.sellLimitSettings.active,
            settings.slippage ?? safety.slippage,
            settings.participatingWallets,
            settings.sellLimitSettings.measure === LimitMeasure.TOKEN_PRICE,
            customValue,
            changingPercent,
            spendByPercent ? settings.sellLimitSettings.spendingPercent : undefined,
            !spendByPercent ? settings.sellLimitSettings.spendingAmount : undefined
        )
        reply(ctx, text, Markup.inlineKeyboard([closeButton]))
    } catch (err) {
        console.error(err);
        errReply(ctx);
    }
}