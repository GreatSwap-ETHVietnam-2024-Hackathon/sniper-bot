import { Markup, Telegraf } from "telegraf";
import { BotContext } from "..";
import { closeButton, edit, getTelegramIdFromContext, reply, safeDeleteMessage } from "../helper";
import { chooseToken } from "./trade";
import { safetySettingsPanel } from "./safety-settings";
import { presetPanel } from "./preset";
import { relayerSettingsPanel } from "./relayer-settings";
import { referralPanel } from "./referral-settings";
import { walletsPanel } from "./wallet";

export function buildMainMenuFunctions(bot: Telegraf<BotContext>) {
    bot.action("Trade menu", async (ctx) => chooseToken(ctx));
    bot.action("Wallet settings menu", async (ctx) => walletsPanel(ctx));
    bot.action("Safety settings menu", async (ctx) => safetySettingsPanel(ctx));
    bot.action("Relayer settings menu", async (ctx) => relayerSettingsPanel(ctx));
    bot.action("Preset menu", async (ctx) => presetPanel(ctx));
    bot.action("Get Telegram ID", async (ctx) => showTelegramID(ctx));
    bot.action("Get Referral", async (ctx) => referralPanel(ctx));
}
export async function showTelegramID(ctx: BotContext) {
    const telegramId = getTelegramIdFromContext(ctx)!;
    const msg = `Here is your Telegram ID: *${telegramId}*`;
    const inlineKeyboard = Markup.inlineKeyboard([closeButton]);
    await reply(ctx, msg, inlineKeyboard);
}
export async function mainPanel(ctx: BotContext, isCommand?: boolean) {
    const msg = `*⚜️ Great Swap Trading Bot*

Trade faster and smarter on Pancake and Lynex without giving up sovereignty
`;

    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("💸 Trade", "Trade menu")],
        [Markup.button.callback("💳 Wallet settings", "Wallet settings menu")],
        [Markup.button.callback("🔒 Safety settings", "Safety settings menu")],
        [Markup.button.callback("🏍️ Relayer settings", "Relayer settings menu")],
        [Markup.button.callback("🎛️ Preset", "Preset menu")],
        [Markup.button.callback("🌐 Referral Information", "Get Referral")],
        [Markup.button.callback("🆔 Get your Telegram ID", "Get Telegram ID")],
        [closeButton],
    ]);
    let msgId = ctx.callbackQuery?.message?.message_id;

    const isNewMsg = isCommand || !(msgId && msgId === ctx.session?.lastMessageId);
    if (isNewMsg) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx);
    } else {
        await edit(ctx, msg, inlineKeyboard);
    }
}
