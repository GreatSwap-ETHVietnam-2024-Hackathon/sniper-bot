import { BotContext } from "..";

export function getTxLastestFromBotSession(ctx: BotContext) {
    return ctx.session?.TxLastest;
}

export function setTxLastest(ctx: BotContext) {
    if (ctx.session) {
        ctx.session.TxLastest = Date.now();
    } else {
        ctx.session = { TxLastest: Date.now() };
    }
}
