import { Markup, Telegraf } from "telegraf";
import { BotContext } from "..";
import { backToMainMenuButton, closeButton, edit, getTelegramIdFromContext, reply, safeDeleteMessage } from "../helper";
import { getRelayerPublicKey } from "../../services/relayer-public-key";
import { getIsPrivRelayerInUseFromBotSession, setIsPrivRelayerInUse } from "../session/private-relayer-in-user";
import { fetchRelayerBalance } from "../../services/balance";
import { refreshDataButton } from "./trade";

export async function relayerSettingsPanel(ctx: BotContext, isCommand?: boolean) {
    const telegramId = getTelegramIdFromContext(ctx)!;
    const relayer = await getRelayerPublicKey(telegramId);
    const balance = await fetchRelayerBalance(relayer);
    const isPrivRelayerInUse = getIsPrivRelayerInUseFromBotSession(ctx);

    const msg = `⚙️ Relayer Settings

Determine a relayer to broadcast your transactions.

If you use public relayers, no setup is required but it can be slow during peak time and their funds may run out overtime due to large amount of users

We recommend you to use your own relayer, which is:
\`${relayer}\`
*(${balance} ETH)*
 
Remember to fund your relayer so it can be able to broadcast your txs on to the blockchain

`
    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback((!isPrivRelayerInUse ? "🟢 " : "🔴 ") + "Public relayers", "Relayer:Public")],
        [Markup.button.callback((isPrivRelayerInUse ? "🟢 " : "🔴 ") + "Your own relayer", "Relayer:Private")],
        [Markup.button.callback("♻️ Refresh", "Relayer:Refresh")],
        [backToMainMenuButton, closeButton]]
    )

    if (isCommand) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx)
    } else {
        await edit(ctx, msg, inlineKeyboard)
    }
}

export function onChangingRelayerSettings(bot: Telegraf<BotContext>) {
    bot.action("Relayer:Public", async (ctx) => {
        setIsPrivRelayerInUse(ctx, false);
        await relayerSettingsPanel(ctx)
    })
    bot.action("Relayer:Private", async (ctx) => {
        setIsPrivRelayerInUse(ctx, true);
        await relayerSettingsPanel(ctx)
    })
    bot.action("Relayer:Refresh", async (ctx) => {
        relayerSettingsPanel(ctx);
    })
}