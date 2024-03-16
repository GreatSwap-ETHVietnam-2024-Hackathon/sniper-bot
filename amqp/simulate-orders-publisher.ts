import { Channel } from "amqplib";
import { Pool } from "../types/token-market-info";
import { simulateOrdersConfig } from ".";

export interface SimulateBuyMessage {
    smartAccountsOwner: string;
    smartAccounts: string[];
    telegramId: number;
    token: string;
    ethAmount: string;
    slippage: number;
    pool: Pool;
    dateTime: number;
}

export interface SimulateSellMessage {
    smartAccounts: string[];
    smartAccountsOwner: string;
    telegramId: number;
    token: string;
    spentToken: string | undefined;
    percent: number | undefined;
    slippage: number;
    pool: Pool;
    dateTime: number;
}

export class SimulateOrderPublisher {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel;
    }

    async publishBuyMessage(msg: SimulateBuyMessage) {
        this.channel.publish(simulateOrdersConfig.REQUEST_EXCHANGE, simulateOrdersConfig.BUY_ROUTING_KEY, Buffer.from(JSON.stringify(msg), "utf-8"));
    }

    async publishSellMessage(msg: SimulateSellMessage) {
        this.channel.publish(simulateOrdersConfig.REQUEST_EXCHANGE, simulateOrdersConfig.SELL_ROUTING_KEY, Buffer.from(JSON.stringify(msg), "utf-8"));
    }

}
