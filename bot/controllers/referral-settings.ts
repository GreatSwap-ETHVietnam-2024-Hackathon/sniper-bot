import { Markup } from "telegraf";
import { BotContext } from "..";
import { backToMainMenuButton, closeButton, reply, safeDeleteMessage, edit, getTelegramIdFromContext } from "../helper";
import { getReferralInfo } from "../../services/referral";

export async function referralPanel(ctx: BotContext, isCommand?: boolean) {
    const telegramId = getTelegramIdFromContext(ctx)!;
    const data = await getReferralInfo(telegramId);

    const msg = `🌐 *Referral Information*

You have invited *${data!.refCount}* account${data!.refCount > 1 ? "s" : ""}

Your Reffal link:
\`t.me/${process.env.BOT_NAME}?start=${data?.code}\`     

Click the above link to copy to clipboard.

 `;
    const inlineKeyboard = Markup.inlineKeyboard([[backToMainMenuButton, closeButton]]);

    if (isCommand) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx);
    } else {
        await edit(ctx, msg, inlineKeyboard);
    }
}
