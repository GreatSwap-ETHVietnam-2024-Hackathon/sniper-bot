import { Markup } from "telegraf";
import { BotContext } from "../..";
import { limitTimeEachRequest } from "../../../configs/constants";
import { getSmartAccountsOwner } from "../../../services/approval";
import { preApprove, preApprovePaymaster } from "../../../services/manual-orders";
import { getTxLastestByTelegramId } from "../../../services/tx-lastest";
import { TradingSettings } from "../../../types/trading-settings";
import { getTelegramIdFromContext, reply, closeButton } from "../../helper";
import { getIsPrivRelayerInUseFromBotSession } from "../../session/private-relayer-in-user";
import { checkTimePassed, base64ToHex } from "../../utils";
import { handleUnconnectedUser } from "../unconnected";

export async function handlePreApprovePaymaster(ctx: BotContext, participatingWallets: string[], tokenBase64: string) {
    const txLastest = await getTxLastestByTelegramId(getTelegramIdFromContext(ctx)!);
    if (txLastest != undefined && checkTimePassed(txLastest, limitTimeEachRequest) == false) {
        return reply(ctx, "🔴 Please wait until your previous transaction is done", Markup.inlineKeyboard([closeButton]));
    }

    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    if (!smartAccountsOwner) return handleUnconnectedUser(ctx);

    const usePrivRelayer = getIsPrivRelayerInUseFromBotSession(ctx);

    const { msg } = await preApprovePaymaster(ctx, smartAccountsOwner, participatingWallets, base64ToHex(tokenBase64), usePrivRelayer);
    reply(ctx, msg, Markup.inlineKeyboard([closeButton]));
}
