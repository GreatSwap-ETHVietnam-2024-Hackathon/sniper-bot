import { Markup, Telegraf } from "telegraf";
import { BotContext, SAFETY_MSG_KEY_PREFIX } from "..";
import { backToMainMenuButton, closeButton, edit, handleNewMessageKey, inputEnquiry, processNumericInput, reply, safeDeleteMessage } from "../helper";
import { getSafetySettingsFromBotSession, setSafetySettings } from "../session/safety-settings";


export async function safetySettingsPanel(ctx: BotContext, isCommand?: boolean) {

    const msg = `⚙️ Safety Settings

`
    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🔒 Slippage", "Safety:Slippage")],
        // [Markup.button.callback("🔒 Min Liquidity Limit", "Safety:Min Liquidity Limit")],
        // [Markup.button.callback("🔒 Max Liquidity Limit", "Safety:Max Liquidity Limit")],
        [backToMainMenuButton, closeButton],
    ])

    if (isCommand) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx)
    } else {
        await edit(ctx, msg, inlineKeyboard)
    }
}

export function buildSafetySettingsFunctions(bot: Telegraf<BotContext>) {
    bot.action(/Safety:.+/, async (ctx) => {
        //@ts-ignore
        const functionName = ctx.callbackQuery.data.split(':')[1]
        const settings = getSafetySettingsFromBotSession(ctx)
        switch (functionName) {
            case "Slippage":
                const slippageMsg = `⚡ Slippage

📈 Current value: ${settings.slippage}% (AFTER TAX)
⚠️ Slippage is after token tax
💡 Enter Value in format "0"

`
                const slippageMessageId = await inputEnquiry(ctx, slippageMsg, ctx.callbackQuery.message!.message_id)
                handleNewMessageKey(ctx, slippageMessageId, `${SAFETY_MSG_KEY_PREFIX}slippage`)
                break;
            //             case "Min Liquidity Limit":
            //                 const minLiquidityMsg = `⚡ Min Liquidity Limit

            // 📈 Current value: ${settings.minLiquidity} USD
            // 💡 Enter Value in format "0.00"

            // `
            //                 const minLiquidityMessageId = await inputEnquiry(ctx, minLiquidityMsg, ctx.callbackQuery.message!.message_id)
            //                 handleNewMessageKey(ctx, minLiquidityMessageId, `${SAFETY_MSG_KEY_PREFIX}minLiquidity`)
            //                 break;
            //             case "Max Liquidity Limit":
            //                 const maxLiquidityMsg = `⚡ Max Liquidity Limit

            // 📈 Current value: ${settings.maxLiquidity} USD
            // 💡 Enter Value in format "0.00"

            // `
            //                 const maxLiquidityMessageId = await inputEnquiry(ctx, maxLiquidityMsg, ctx.callbackQuery.message!.message_id)
            //                 handleNewMessageKey(ctx, maxLiquidityMessageId, `${SAFETY_MSG_KEY_PREFIX}maxLiquidity`)
            //                 break;
        }
    })
}

export function handleUserInputs(ctx: BotContext, msgId: number, functionName: string, userInput: string) {
    const settings = getSafetySettingsFromBotSession(ctx)
    let deleteMSG = true;

    switch (functionName) {
        case "slippage":
            const slippage = processNumericInput(userInput, false, 0, 99.9, 4)
            console.log(" slip ", slippage, " x ",  slippage! >= 100 ? "true" : "false" );
            if (!slippage || slippage >= 100) {
                const errText = `*⚠︎ Invalid input *`
                const inlineKeyboard = Markup.inlineKeyboard([[closeButton]])
                reply(ctx, errText, inlineKeyboard);
            }
            else {
                const oldSlippage = settings.slippage;
                settings.slippage = slippage
                const slippageText = `🟢 *Slippage Set*
        
Previous value: ${oldSlippage}%
New value: ${slippage}%
        `

                reply(ctx, slippageText, Markup.inlineKeyboard([closeButton]))
                setSafetySettings(ctx, settings)
            }
            break;
        //         case "minLiquidity":
        //             const minLiquidity = parseFloat(userInput)
        //             const oldMinLiquidity = settings.minLiquidity;

        //             const minLiquidityText = `🟢 *Min Liquidity Set*

        // Previous value: ${oldMinLiquidity}%
        // New value: ${minLiquidity}%
        //         `

        //             reply(ctx, minLiquidityText, Markup.inlineKeyboard([closeButton]))

        //             settings.minLiquidity = minLiquidity
        //             setSafetySettings(ctx, settings)
        //             break;
        //         case "maxLiquidity":
        //             const maxLiquidity = parseFloat(userInput)
        //             const oldMaxLiquidity = settings.maxLiquidity;

        //             const maxLiquidityText = `🟢 *Max Liquidity Set*

        // Previous value: ${oldMaxLiquidity}%
        // New value: ${maxLiquidity}%
        //         `

        //             reply(ctx, maxLiquidityText, Markup.inlineKeyboard([closeButton]))

        //             settings.maxLiquidity = maxLiquidity
        //             setSafetySettings(ctx, settings)
        //             break;
        default:
            deleteMSG = false
            break;
    }

    if (deleteMSG) {
        safeDeleteMessage(ctx, msgId)
    }
}
