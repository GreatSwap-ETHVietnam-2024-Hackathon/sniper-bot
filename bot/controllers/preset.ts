import { Markup, Telegraf } from "telegraf";
import { BotContext, PRESET_MSG_KEY_PREFIX } from "..";
import { backToMainMenuButton, closeButton, edit, handleNewMessageKey, inputEnquiry, processNumericInput, reply, safeDeleteMessage } from "../helper";
import { getPresetFromBotSession, setPresetSettings } from "../session/preset";
import { chunk } from "../utils";

export async function presetPanel(ctx: BotContext, isCommand?: boolean) {

    const msg = `⚙️ Preset settings

`
    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Manual Buy Preset", "Preset:ManualBuy")],
        [Markup.button.callback("🛍️ Manual Sell Preset", "Preset:ManualSell")],
        [Markup.button.callback("📉 Buy Limit Preset", "Preset:BuyLimit")],
        [Markup.button.callback("📈 Sell Limit Preset", "Preset:SellLimit")],
        [backToMainMenuButton, closeButton],
    ])

    if (isCommand) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx)
    } else {
        await edit(ctx, msg, inlineKeyboard)
    }
}

function manualBuyPanel(ctx: BotContext) {
    const msg = `⚙️ Manual Buy Amount Presets

💡 Click on the button that you would like to change the value of
    `
    const preset = getPresetFromBotSession(ctx)
    const chunkSize = 2;
    const chunks = chunk(preset.manualBuy, chunkSize);
    const inlineKeyboard = Markup.inlineKeyboard([
        ...chunks.map((chunk, chunkId) => chunk.map(
            (value, id) => {
                const index = chunkSize * chunkId + id
                return Markup.button.callback(`${value} ETH`, `Manual Buy Preset:${index}`)
            }
        )),
        [Markup.button.callback("< Back", "Back to preset"), closeButton]
    ])
    return { msg, inlineKeyboard }
}

function manualSellPanel(ctx: BotContext) {
    const msg = `⚙️ Manual Sell Amount Presets

💡 Click on the button that you would like to change the value of
    `
    const preset = getPresetFromBotSession(ctx)
    const chunkSize = 2;
    const chunks = chunk(preset.manualSell, chunkSize);
    const inlineKeyboard = Markup.inlineKeyboard([
        ...chunks.map((chunk, chunkId) => chunk.map(
            (value, id) => {
                const index = chunkSize * chunkId + id
                return Markup.button.callback(`${value}%`, `Manual Sell Preset:${index}`)
            }
        )),
        [Markup.button.callback("< Back", "Back to preset"), closeButton]
    ])
    return { msg, inlineKeyboard }
}

function buyLimitPanel(ctx: BotContext) {
    const msg = `⚙️ Buy Limit Amount Presets

💡 Click on the button that you would like to change the value of
    `
    const preset = getPresetFromBotSession(ctx)
    const chunkSize = 2;
    const chunks = chunk(preset.buyLimit, chunkSize);
    const inlineKeyboard = Markup.inlineKeyboard([
        ...chunks.map((chunk, chunkId) => chunk.map(
            (value, id) => {
                const index = chunkSize * chunkId + id
                return Markup.button.callback(`${value}%`, `Buy Limit Preset:${index}`)
            }
        )),
        [Markup.button.callback("< Back", "Back to preset"), closeButton]
    ])
    return { msg, inlineKeyboard }
}
function sellLimitPanel(ctx: BotContext) {
    const msg = `⚙️ Sell Limit Amount Presets

💡 Click on the button that you would like to change the value of
    `
    const preset = getPresetFromBotSession(ctx)
    const chunkSize = 2;
    const chunks = chunk(preset.sellLimit, chunkSize);
    const inlineKeyboard = Markup.inlineKeyboard([
        ...chunks.map((chunk, chunkId) => chunk.map(
            (value, id) => {
                const index = chunkSize * chunkId + id
                return Markup.button.callback(`${value}%`, `Sell Limit Preset:${index}`)
            }
        )),
        [Markup.button.callback("< Back", "Back to preset"), closeButton]
    ])
    return { msg, inlineKeyboard }
}

function openPreset(bot: Telegraf<BotContext>) {
    bot.action("Preset:ManualBuy", async (ctx) => {
        const { msg, inlineKeyboard } = manualBuyPanel(ctx)
        await edit(ctx, msg, inlineKeyboard)
    })
    bot.action("Preset:ManualSell", async (ctx) => {
        const { msg, inlineKeyboard } = manualSellPanel(ctx)
        await edit(ctx, msg, inlineKeyboard)
    })
    bot.action("Preset:BuyLimit", async (ctx) => {
        const { msg, inlineKeyboard } = buyLimitPanel(ctx)
        await edit(ctx, msg, inlineKeyboard)
    })
    bot.action("Preset:SellLimit", async (ctx) => {
        const { msg, inlineKeyboard } = sellLimitPanel(ctx)
        await edit(ctx, msg, inlineKeyboard)
    })
    bot.action("Back to preset", async (ctx) => presetPanel(ctx))
}

function onChangingValue(bot: Telegraf<BotContext>) {
    bot.action(/Manual Buy Preset:.+/, async (ctx) => {
        const preset = getPresetFromBotSession(ctx);
        //@ts-ignore
        const index = ctx.callbackQuery.data.split(':')[1];
        const msg = `⚡ Manual Buy Preset Amount

📈 Current value: ${preset.manualBuy[index]} ETH
💡 Enter Value in format "0.00"
        
        `
        safeDeleteMessage(ctx);
        const msgId = await inputEnquiry(ctx, msg)
        handleNewMessageKey(ctx, msgId, `${PRESET_MSG_KEY_PREFIX}ManualBuy:${index}`)
    })
    bot.action(/Manual Sell Preset:.+/, async (ctx) => {
        const preset = getPresetFromBotSession(ctx);
        //@ts-ignore
        const index = ctx.callbackQuery.data.split(':')[1];
        const msg = `⚡ Manual Sell Preset Amount

📈 Current value: ${preset.manualSell[index]}%
💡 Enter Value in format "0.00"
        
        `
        safeDeleteMessage(ctx);
        const msgId = await inputEnquiry(ctx, msg)
        handleNewMessageKey(ctx, msgId, `${PRESET_MSG_KEY_PREFIX}ManualSell:${index}`)
    })
    bot.action(/Buy Limit Preset:.+/, async (ctx) => {
        const preset = getPresetFromBotSession(ctx);
        //@ts-ignore
        const index = ctx.callbackQuery.data.split(':')[1];
        const msg = `⚡ Buy Limit Preset Amount

📈 Current value: ${preset.buyLimit[index]}%
💡 Enter Value in format "0.00"
        
        `
        safeDeleteMessage(ctx);
        const msgId = await inputEnquiry(ctx, msg)
        handleNewMessageKey(ctx, msgId, `${PRESET_MSG_KEY_PREFIX}BuyLimit:${index}`)
    })
    bot.action(/Sell Limit Preset:.+/, async (ctx) => {
        const preset = getPresetFromBotSession(ctx);
        //@ts-ignore
        const index = ctx.callbackQuery.data.split(':')[1];
        const msg = `⚡ Sell Limit Preset Amount

📈 Current value: ${preset.sellLimit[index]}%
💡 Enter Value in format "0.00"
        
        `
        safeDeleteMessage(ctx);
        const msgId = await inputEnquiry(ctx, msg)
        handleNewMessageKey(ctx, msgId, `${PRESET_MSG_KEY_PREFIX}SellLimit:${index}`)
    })
}

export async function handleUserInputs(ctx: BotContext, msgId: number, msgKey: string, userInput: string) {
    const preset = getPresetFromBotSession(ctx);
    let deleteMSG = true;
    const [functionName, indexStr] = msgKey.split(":")
    const index = parseInt(indexStr)
    switch (functionName) {
        case "ManualBuy":
            const manualBuyValue = processNumericInput(userInput, false, 0, undefined, 10);
            if (!manualBuyValue) {
                const errText = `*⚠︎ Invalid input*`
                const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("< Back", "Back to preset"), closeButton]])
                reply(ctx, errText, inlineKeyboard);
            }
            else {
                preset.manualBuy[index] = manualBuyValue
                setPresetSettings(ctx, preset)
                const { msg: manualText, inlineKeyboard: manualInlineKeyboard } = manualBuyPanel(ctx)
                reply(ctx, manualText, manualInlineKeyboard)
            }
            break;
        case "ManualSell":
            const manualSellValue = processNumericInput(userInput, false, 0, undefined, 10);
            if (!manualSellValue) {
                const errText = `*⚠︎ Invalid input*`
                const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("< Back", "Back to preset"), closeButton]])
                reply(ctx, errText, inlineKeyboard);
            }
            else {
                preset.manualSell[index] = manualSellValue
                setPresetSettings(ctx, preset)
                const { msg: manualText, inlineKeyboard: manualInlineKeyboard } = manualSellPanel(ctx)
                reply(ctx, manualText, manualInlineKeyboard)
            }
            break;
        case "BuyLimit":
            const buyLimitValue = processNumericInput(userInput, false, -100, -0.000001, 4);
            if (!buyLimitValue) {
                const errText = `*⚠︎ Invalid input*`
                const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("< Back", "Back to preset"), closeButton]])
                reply(ctx, errText, inlineKeyboard);
            } else {
                preset.buyLimit[index] = buyLimitValue
                setPresetSettings(ctx, preset)
                const { msg: limitText, inlineKeyboard: limitInlineKeyboard } = buyLimitPanel(ctx)
                reply(ctx, limitText, limitInlineKeyboard)
            }
            break;
        case "SellLimit":
            const sellLimitValue = processNumericInput(userInput, false, -100, undefined, 4);
            if (!sellLimitValue) {
                const errText = `*⚠︎ Invalid input*`
                const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback("< Back", "Back to preset"), closeButton]])
                reply(ctx, errText, inlineKeyboard);
            } else {
                preset.sellLimit[index] = sellLimitValue
                setPresetSettings(ctx, preset)
                const { msg: limitText, inlineKeyboard: limitInlineKeyboard } = sellLimitPanel(ctx)
                reply(ctx, limitText, limitInlineKeyboard)
            }
            break;
        default:
            deleteMSG = false
            break;
    }
    if (deleteMSG) {
        safeDeleteMessage(ctx, msgId)
    }
}

export function buildPresetFunctions(bot: Telegraf<BotContext>) {
    openPreset(bot)
    onChangingValue(bot)
}