import { BotContext } from "..";

export function getIsPrivRelayerInUseFromBotSession(ctx: BotContext) {
    return ctx.session?.isPrivRelayerInUse
}

export function setIsPrivRelayerInUse(ctx: BotContext, isPrivRelayerInUse: boolean) {
    if (ctx.session) {
        ctx.session.isPrivRelayerInUse = isPrivRelayerInUse
    }
    else {
        ctx.session = {
            isPrivRelayerInUse
        }
    }
}