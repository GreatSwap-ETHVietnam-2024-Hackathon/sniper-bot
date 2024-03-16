import { AxiosError } from "axios";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { getTokenConfig } from "./token-config";
import { getMarketInfo } from "./trading-data";
import { getApproval } from "./approval";
import { BuyMessage, PreApproveMessage, SellMessage } from "../amqp/manual-orders-publisher";
import manualOrdersRMQ from "../amqp";
import { BotContext } from "../bot";
import { getTelegramIdFromContext } from "../bot/helper";
import { setTxLastestByTelegramId } from "./tx-lastest";

export async function buyToken(
    ctx: BotContext,
    smartAccountsOwner: string,
    participatingWallets: string[],
    token: string,
    ethAmount: number,
    slippage: number,
    usePrivRelayer?: boolean
) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        if (approval.locked) {
            return {
                msg: "🔴 Account is locked ",
            };
        }
        const smartAccounts = participatingWallets.filter((wallet) => approval.smartAccounts.includes(wallet));

        if (smartAccounts.length === 0) {
            return { msg: "🔴 No account chosen " };
        }

        const marketInfo = await getMarketInfo(token);
        const pool = marketInfo.mostLiquidPool;

        const manualMessage: BuyMessage = {
            smartAccountsOwner: smartAccountsOwner,
            smartAccounts: smartAccounts,
            telegramId: telegramId,
            token: token,
            ethAmount: parseEther(`${ethAmount}`).toString(),
            slippage: slippage,
            pool: pool,
            dateTime: Date.now(),
            usePrivRelayer,
        };

        await manualOrdersRMQ.publishBuyMessage(manualMessage);
        setTxLastestByTelegramId(telegramId);

        return {
            msg: "⏳ Your transaction is in process...",
        };
    } catch (err) {
        return {
            msg: `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`,
        };
    }
}

export async function sellToken(
    ctx: BotContext,
    smartAccountsOwner: string,
    participatingWallets: string[],
    token: string,
    slippage: number,
    percent?: number,
    tokenAmount?: number,
    usePrivRelayer?: boolean
) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        if (approval.locked) {
            return {
                msg: `🔴 Account is locked `,
            };
        }
        const smartAccounts = participatingWallets.filter((wallet) => approval.smartAccounts.includes(wallet));

        if (smartAccounts.length === 0) {
            return {
                msg: "🔴 No account chosen ",
            };
        }
        const config = await getTokenConfig(token);
        const spentToken = tokenAmount ? parseUnits(`${tokenAmount}`, config.decimals).toString() : undefined;
        const marketInfo = await getMarketInfo(token);
        const pool = marketInfo.mostLiquidPool;
        const manualSellMessage: SellMessage = {
            smartAccounts,
            smartAccountsOwner,
            telegramId,
            token,
            spentToken,
            percent,
            slippage,
            pool,
            dateTime: Date.now(),
            usePrivRelayer,
        };

        await manualOrdersRMQ.publishSellMessage(manualSellMessage);
        setTxLastestByTelegramId(telegramId);
        return {
            msg: "⏳ Your transaction is in process...",
        };
    } catch (err) {
        return {
            msg: `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`,
        };
    }
}

export async function preApprove(
    ctx: BotContext,
    smartAccountsOwner: string,
    participatingWallets: string[],
    token: string,
    usePrivRelayer?: boolean
) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        if (approval.locked) {
            return {
                msg: `🔴 Account is locked `,
            };
        }
        const smartAccounts = participatingWallets.filter((wallet) => approval.smartAccounts.includes(wallet));

        if (smartAccounts.length === 0) {
            return { msg: "🔴 No account chosen" };
        }

        const marketInfo = await getMarketInfo(token);
        const pool = marketInfo.mostLiquidPool;

        const manualPreApproveMessage: PreApproveMessage = {
            smartAccountsOwner,
            smartAccounts,
            telegramId,
            poolName: pool.name,
            token,
            allowance: parseEther("1000000000").toString(),
            usePrivRelayer,
        };

        await manualOrdersRMQ.publishPreApproveMessage(manualPreApproveMessage);
        setTxLastestByTelegramId(telegramId);
        return { msg: "⏳ Your transaction is in process...", error: false };
    } catch (err) {
        return { msg: `🔴 ${(err as Error).message}`, error: true };
    }
}

export async function preApprovePaymaster(
    ctx: BotContext,
    smartAccountsOwner: string,
    participatingWallets: string[],
    token: string,
    usePrivRelayer?: boolean
) {
    try {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const approval = await getApproval(telegramId);
        if (approval.locked) {
            return {
                msg: `🔴 Account is locked `,
            };
        }
        const smartAccounts = participatingWallets.filter((wallet) => approval.smartAccounts.includes(wallet));

        if (smartAccounts.length === 0) {
            return { msg: "🔴 No account chosen" };
        }

        const manualPreApproveMessage: PreApproveMessage = {
            smartAccountsOwner,
            smartAccounts,
            telegramId,
            poolName: "Paymaster",
            token,
            allowance: parseEther("1000000000").toString(),
            usePrivRelayer,
        };
        await manualOrdersRMQ.publishPreApproveMessage(manualPreApproveMessage);
        setTxLastestByTelegramId(telegramId);
        return { msg: "⏳ Your transaction is in process...", error: false };
    } catch (err) {
        return { msg: `🔴 ${(err as Error).message}`, error: true };
    }
}
