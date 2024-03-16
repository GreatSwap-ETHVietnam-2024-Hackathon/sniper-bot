import { BotContext } from "../bot";
import { closeButton, getTelegramIdFromContext } from "../bot/helper";
import ApprovalModel from "../models/approval";

export async function getApproval(telegramId: number) {
    const approval = await ApprovalModel.findOne({
        telegramId,
        connected: true,
    });
    if (!approval) {
        throw new Error("No approval data exists");
    }
    return approval;
}

export async function getSmartAccountsOwnerById(telegramId: number) {
    const approval = await getApproval(telegramId);
    return approval.smartAccountsOwner;
}

export async function getSmartAccountsOwner(ctx: BotContext) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        return approval.smartAccountsOwner;
    } catch (err) {
        return undefined;
    }
}
export async function getSmartAccounts(ctx: BotContext) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        return approval.smartAccounts;
    } catch (err) {
        return [];
    }
}

export async function connectToAccountsOwner(telegramId: number, smartAccountsOwner: string) {
    const approval = await ApprovalModel.findOne({
        telegramId,
        smartAccountsOwner,
    });

    if (!approval) {
        throw new Error("No approval data exists");
    }

    if (!approval.connected) {
        await ApprovalModel.updateOne(
            {
                telegramId,
                connected: true,
            },
            {
                $set: {
                    connected: false,
                },
            }
        );

        await ApprovalModel.updateOne(
            {
                telegramId,
                smartAccountsOwner,
            },
            {
                $set: {
                    connected: true,
                },
            }
        );
    }

    return approval.smartAccounts;
}

export async function getAllTradableTokens(telegramId: number) {
    try {
        const approval = await getApproval(telegramId);
        return approval.tokens;
    } catch (err) {
        return [];
    }
}
