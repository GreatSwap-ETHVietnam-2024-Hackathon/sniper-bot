import { BotContext } from ".."

export function setLastMessage(ctx: BotContext, msgId: number) {
    if (!ctx.session)
        ctx.session = { lastMessageId: msgId }
    else ctx.session.lastMessageId = msgId;
}

export function getMessageIdByKey(ctx: BotContext, key: string, del: boolean = true) {
    if (ctx.session?.messages) {
        const found = Object.entries(ctx.session.messages).find(([id, k]) => k === key)
        if (found) {
            const id = parseInt(found[0])
            if (del) delete ctx.session.messages[id]
            return id
        }
    }
    return undefined
}
export function setMessageKey(ctx: BotContext, msgId: number, key: string) {
    if (ctx.session) {
        if (ctx.session.messages) {
            ctx.session.messages[msgId] = key
        } else {
            ctx.session.messages = {
                [msgId]: key
            }
        }
    }
    else {
        ctx.session = {
            messages: {
                [msgId]: key
            }
        }
    }
}