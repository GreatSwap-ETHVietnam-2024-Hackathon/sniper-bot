import { AxiosError } from "axios";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { getTokenConfig } from "./token-config";
import { getMarketInfo } from "./trading-data";
import { getApproval } from "./approval";
import simulateOrdersRMQ from "../amqp";
import { BotContext } from "../bot";
import { getTelegramIdFromContext } from "../bot/helper";
import { setTxLastestByTelegramId } from "./tx-lastest";
import { SimulateBuyMessage, SimulateSellMessage } from "../amqp/simulate-orders-publisher";

export async function SimulateBuyToken(ctx: BotContext, smartAccountsOwner: string, participatingWallets: string[], token: string, ethAmount: number, slippage: number) {
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

        if (smartAccounts.length !== 1) {
            return { msg: "🔴 Simulation is only available for 1 smart account" };
        }

        const marketInfo = await getMarketInfo(token);
        const pool = marketInfo.mostLiquidPool;

        const simulateMessage: SimulateBuyMessage = {
            smartAccountsOwner: smartAccountsOwner,
            smartAccounts: smartAccounts,
            telegramId: telegramId,
            token: token,
            ethAmount: parseEther(`${ethAmount}`).toString(),
            slippage: slippage,
            pool: pool,
            dateTime: Date.now(),
        };

        await simulateOrdersRMQ.publishSimulateBuyMessage(simulateMessage);
        setTxLastestByTelegramId(telegramId);

        return {
            msg: "⏳ Simulating transaction...",
        };
    } catch (err) {
        return {
            msg: `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`,
        };
    }
}

export async function SimulateSellToken(ctx: BotContext, smartAccountsOwner: string, participatingWallets: string[], token: string, slippage: number, percent?: number, tokenAmount?: number) {
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

        if (smartAccounts.length !== 1) {
            return { msg: "🔴 Simulation is only available for 1 smart account " };
        }

        const config = await getTokenConfig(token);
        const spentToken = tokenAmount ? parseUnits(`${tokenAmount}`, config.decimals).toString() : undefined;
        const marketInfo = await getMarketInfo(token);
        const pool = marketInfo.mostLiquidPool;
        const simulateSellMessage: SimulateSellMessage = {
            smartAccounts,
            smartAccountsOwner,
            telegramId,
            token,
            spentToken,
            percent,
            slippage,
            pool,
            dateTime: Date.now(),
        };

        await simulateOrdersRMQ.publishSimulateSellMessage(simulateSellMessage);
        setTxLastestByTelegramId(telegramId);
        return {
            msg: "⏳ Simulating transaction...",
        };
    } catch (err) {
        return {
            msg: `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`,
        };
    }
}

