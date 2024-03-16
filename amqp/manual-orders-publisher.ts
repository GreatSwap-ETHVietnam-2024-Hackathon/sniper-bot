import { Channel } from "amqplib";
import { Pool } from "../types/token-market-info";
import { manualOrdersConfig } from ".";

export interface BuyMessage {
    smartAccountsOwner: string;
    smartAccounts: string[];
    telegramId: number;
    token: string;
    ethAmount: string;
    slippage: number;
    pool: Pool;
    dateTime: number;
    usePrivRelayer?: boolean;
}

export interface SellMessage {
    smartAccounts: string[];
    smartAccountsOwner: string;
    telegramId: number;
    token: string;
    spentToken: string | undefined;
    percent: number | undefined;
    slippage: number;
    pool: Pool;
    dateTime: number;
    usePrivRelayer?: boolean;
}

export interface PreApproveMessage {
    smartAccountsOwner: string;
    smartAccounts: string[];
    telegramId: number;
    poolName: "Pancake" | "Lynex" | "Paymaster";
    token: string;
    allowance: string;
    usePrivRelayer?: boolean;
}

export class ManualOrderPublisher {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel;
    }

    async publishBuyMessage(msg: BuyMessage) {
        this.channel.publish(
            manualOrdersConfig.REQUEST_EXCHANGE,
            manualOrdersConfig.BUY_ROUTING_KEY,
            Buffer.from(JSON.stringify(msg), "utf-8")
        );
    }

    async publishSellMessage(msg: SellMessage) {
        this.channel.publish(
            manualOrdersConfig.REQUEST_EXCHANGE,
            manualOrdersConfig.SELL_ROUTING_KEY,
            Buffer.from(JSON.stringify(msg), "utf-8")
        );
    }

    async publishPreApproveMessage(msg: PreApproveMessage) {
        this.channel.publish(
            manualOrdersConfig.REQUEST_EXCHANGE,
            manualOrdersConfig.PRE_APPROVE_ROUTING_KEY,
            Buffer.from(JSON.stringify(msg), "utf-8")
        );
    }
}
