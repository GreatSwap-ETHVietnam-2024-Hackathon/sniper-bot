import { Markup, Telegraf } from "telegraf";
import { BotContext } from ".";
import { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { mainPanel } from "./controllers/main-menu";
import { getMessageIdByKey, setLastMessage, setMessageKey } from "./session/messages";
import BigNumber from "bignumber.js";

function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
export async function handleNewMessageKey(ctx: BotContext, activeMessageId: number, msgKey: string) {
    const msgId = getMessageIdByKey(ctx, msgKey);
    if (msgId) safeDeleteMessage(ctx, msgId);

    setMessageKey(ctx, activeMessageId, msgKey);
}
export async function edit(ctx: BotContext, text: string, inline?: Markup.Markup<InlineKeyboardMarkup>, targetId?: number) {
    let trials = 100;
    while (trials > 0) {
        try {
            if (targetId) {
                await ctx.telegram.editMessageText(ctx.chat?.id, targetId, undefined, text, {
                    ...inline,
                    parse_mode: "Markdown",
                    link_preview_options: { is_disabled: true }
                });

                return targetId;
            }

            await ctx.editMessageText(text, {
                ...inline,
                parse_mode: "Markdown", link_preview_options: { is_disabled: true }
            });

            let msgId = ctx.callbackQuery?.message?.message_id;
            return msgId ?? 0;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return 0;
            }
        }
    }
    return 0;
}

export async function errReply(ctx: BotContext) {
    let trials = 100;
    while (trials > 0) {
        try {
            const msg = await ctx.reply("🔴 Operation failed for an unknown reason", Markup.inlineKeyboard([closeButton]));
            setLastMessage(ctx, msg.message_id);
            return msg.message_id;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return 0;
            }
        }
    }
    return 0;
}
export async function reply(ctx: BotContext, text: string, inline?: Markup.Markup<InlineKeyboardMarkup>, reply_to?: number) {
    let trials = 100;
    while (trials > 0) {
        try {
            try {
                const msg = reply_to ? await ctx.reply(text, {
                    ...inline,
                    reply_parameters: { message_id: reply_to },
                    parse_mode: "Markdown",
                    link_preview_options: { is_disabled: true }
                }) :
                    await ctx.reply(text, {
                        ...inline,
                        parse_mode: "Markdown",
                        link_preview_options: { is_disabled: true }
                    })
                    ;
                const msgId = msg.message_id;
                setLastMessage(ctx, msgId);
                return msgId;
            } catch (err) {
                console.log("error: ", err);
                //@ts-ignore
                if (err?.response?.error_code === 429) {
                    throw err;
                } else return await errReply(ctx);
            }
        } catch (err) {
            console.log("error: ", err);
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return 0;
            }
        }
    }
    return 0;
}

export async function inputEnquiry(ctx: BotContext, text: string, reply_to?: number) {
    let trials = 100;
    while (trials > 0) {
        try {
            const msg = reply_to ? await ctx.reply(text, {
                ...Markup.forceReply(),
                parse_mode: "Markdown",
                link_preview_options: { is_disabled: true },
                reply_parameters: { message_id: reply_to }
            }) : await ctx.reply(text, {
                ...Markup.forceReply(),
                parse_mode: "Markdown",
                link_preview_options: { is_disabled: true }
            });

            const msgId = msg.message_id;
            setLastMessage(ctx, msgId);
            return msgId;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return 0;
            }
        }
    }
    return 0;
}

export async function sendMessage(bot: Telegraf<BotContext>, telegramId: number, text: string, inline?: Markup.Markup<InlineKeyboardMarkup>) {
    let trials = 100;
    while (trials > 0) {
        try {
            bot.telegram.sendMessage(telegramId, text, {
                ...inline,
                parse_mode: "Markdown", link_preview_options: { is_disabled: true }
            });
            return;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return;
            }
        }
    }
}

export async function safeDeleteMessage(ctx: BotContext, msgId?: number) {
    let trials = 100;
    while (trials > 0) {
        try {
            try {
                await ctx.deleteMessage(msgId);
            } catch (err) { }
            if (ctx.session?.messages && msgId) {
                delete ctx.session.messages[msgId];
            }
            return;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return;
            }
        }
    }
}

export async function safeDeleteMessageWTContext(bot: Telegraf<BotContext>, chatId: number, msgId: number) {
    let trials = 100;
    while (trials > 0) {
        try {
            await bot.telegram.deleteMessage(chatId, msgId);
            return;
        } catch (err) {
            //@ts-ignore
            if (err?.response?.error_code === 429) {
                trials--;
                //@ts-ignore
                const sleepTime = err.response.parameters?.retry_after ?? 10;
                await delay(sleepTime);
            } else {
                return;
            }
        }
    }
}
export const closeButton = Markup.button.callback("x Close", "close");

export const backToMainMenuButton = Markup.button.callback("< Back", "back to main menu");

export function deleteMessageOnCloseAction(bot: Telegraf<BotContext>) {
    bot.action("close", (ctx) => {
        safeDeleteMessage(ctx);
    });
}

export function backToMainMenu(bot: Telegraf<BotContext>) {
    bot.action("back to main menu", async (ctx) => await mainPanel(ctx));
}

export function getTelegramIdFromContext(ctx: BotContext) {
    return ctx.message?.from.id ?? ctx.callbackQuery?.from.id;
}

export function processNumericInput(input: string, integerRequired: boolean = false, min?: number, max?: number, precision: number = 6) {
    if (Number.isNaN(input)) return undefined;
    if (integerRequired && !Number.isInteger(input)) return undefined;
    const numericValue = new BigNumber(input);
    if (min !== undefined && numericValue.lt(min)) return undefined;
    if (max !== undefined && numericValue.gt(max)) return undefined;
    const stringValue = numericValue.toFixed(precision);
    return Number(stringValue);
}
