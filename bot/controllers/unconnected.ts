import { Markup } from "telegraf";
import { BotContext } from "..";
import { closeButton, getTelegramIdFromContext, reply, safeDeleteMessage } from "../helper";


export async function handleUnconnectedUser(ctx: BotContext) {
    const telegramId = getTelegramIdFromContext(ctx)!;
    const msg = `*⚜️ Welcome to Great Swap Trading Bot!*

You have not connected to any wallet yet.
    
Please connect one to use the bot via *Great Swap Station* or by entering your wallet address that you already approved the bot.`

    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.url(`Go to Great Swap Station`, `${process.env.STATION_URL}bot-settings/${telegramId}`)],
        [Markup.button.callback(`Enter Web3 address`, "Enter Web3 address")],
        [closeButton],
    ])
    await reply(ctx, msg, inlineKeyboard);
    safeDeleteMessage(ctx)
}

