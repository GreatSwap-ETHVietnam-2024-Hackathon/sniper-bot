import { Markup, Telegraf } from "telegraf";
import { ACCOUNT_MSG_KEY_PREFIX, BotContext } from "..";
import { closeButton, getTelegramIdFromContext, handleNewMessageKey, inputEnquiry, reply, safeDeleteMessage } from "../helper";
import { getVerifyUserInfo } from "../../services/verify-user";
import InviteCodeModel from "../../models/invite-code";
import VerifyUserModel from "../../models/verify-user";
import { mainPanel } from "./main-menu";

export async function checkVerifyFromMessage(ctx: BotContext) {
    const telegramId = getTelegramIdFromContext(ctx)!;
    //const data = await getVerifyUserInfo(telegramId);
    //     if (data == null || data.verified == false) {
    //         const msg = `*⚜️ Welcome to Great Swap Trading Bot!*
    // Please kindly proceed with the verification process.
    //         `;
    //         const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.url(`Go to verify`, `t.me/${process.env.VERIFY_BOT_NAME}?start=`)], [closeButton]]);
    //         await reply(ctx, msg, inlineKeyboard);
    //         safeDeleteMessage(ctx);
    //         return true;
    //     }
    //     if (data.inviteCode == undefined) {
    //         const msg = `*⚜️ Welcome to Great Swap Trading Bot!*
    // Please enter an invite code to participate.
    //         `;
    //         const inlineKeyboard = Markup.inlineKeyboard([
    //             [Markup.button.callback(`I have an invite code`, `try invite code`)],
    //             [closeButton]
    //         ]);
    //         await reply(ctx, msg, inlineKeyboard);
    //         return true;
    //     }

    return false;
}

export async function handleUserInputs(ctx: BotContext, msgId: number, msgKey: string, userInput: string) {
    let deleteMSG = true;
    const [functionName, address] = msgKey.split(":");
    switch (functionName) {
        case "EnterInviteCode":
            const data = await InviteCodeModel.findOne({ code: userInput });
            if (data == undefined) {
                const msg = `*⚜️ Great Swap Trading Bot!*
Sorry, the invite code ${userInput} does not exist.
Please enter another one.
        `;
                const inlineKeyboard = Markup.inlineKeyboard([[Markup.button.callback(`Try again`, `try invite code`)]]);
                await reply(ctx, msg, inlineKeyboard);
                break;
            }
            const currentDate = new Date();
            if (data?.expirationDate! < currentDate) {
                const msg = `*⚜️ Great Swap Trading Bot!*
Sorry, the invite code ${userInput} has expired.
Please enter another one.
        `;
                const inlineKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback(`Type another invite code`, `try invite code`)],
                    [closeButton],
                ]);
                await reply(ctx, msg, inlineKeyboard);
                break;
            }
            if (data?.usages.length! >= data?.maxUsages!) {
                const msg = `*⚜️ Great Swap Trading Bot!*
Sorry, the invite code ${userInput} has reached its maximum usages.
Please enter another one.
        `;
                const inlineKeyboard = Markup.inlineKeyboard([
                    [Markup.button.callback(`Type another invite code`, `try invite code`)],
                    [closeButton],
                ]);
                await reply(ctx, msg, inlineKeyboard);
                break;
            }
            const telegramId = getTelegramIdFromContext(ctx)!;
            //success
            data.usages.push({
                usedBy: telegramId,
                usedAt: currentDate,
            });
            await data.save();
            await VerifyUserModel.findOneAndUpdate({ user_id: telegramId }, { inviteCode: data.code }, { new: true, upsert: true });
            await mainPanel(ctx, true);
            break;
        default:
            deleteMSG = false;
            break;
    }
    if (deleteMSG) {
        safeDeleteMessage(ctx, msgId);
    }
}

function onHaveInviteCode(bot: Telegraf<BotContext>) {
    bot.action("try invite code", async (ctx) => {
        const msg = `Type your invite code`;
        const msgId = await inputEnquiry(ctx, msg);
        handleNewMessageKey(ctx, msgId, `${ACCOUNT_MSG_KEY_PREFIX}EnterInviteCode`);
    });
}

export function buildVerifyFunctions(bot: Telegraf<BotContext>) {
    onHaveInviteCode(bot);
}
