import { Channel } from "amqplib";
import { manualOrdersConfig } from ".";
import { buyResponse, preApproveResponse, sellResponse } from "../services/manual-order-execution";

export class ManualOrderConsumer {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel;

        // buy
        this.channel.consume(manualOrdersConfig.BUY_RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: ManualBuyResponse = JSON.parse(message.content);
                buyResponse(data);
                this.channel.ack(message);
            }
        });

        // sell
        this.channel.consume(manualOrdersConfig.SELL_RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: ManualSellResponse = JSON.parse(message.content);
                sellResponse(data);
                this.channel.ack(message);
            }
        });

        // pre-approve
        this.channel.consume(manualOrdersConfig.PRE_APPROVE_RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: ManualPreApproveResponse = JSON.parse(message.content);
                preApproveResponse(data);
                this.channel.ack(message);
            }
        });
    }
}

export interface ManualBuyResponse {
    telegramId: number;
    token: string;
    error?: string;
    opErrors?: {
        [key: string]: string;
    };
    noOpErrors?: string[];
    txHash?: string;
    txError?: string;
    sentTokenList?: { [key: string]: string };
    receivedTokenList?: { [key: string]: string };
}

export interface ManualSellResponse {
    telegramId: number;
    token: string;
    error?: string;
    opErrors?: {
        [key: string]: string;
    };
    noOpErrors?: string[];
    txHash?: string;
    txError?: string;
    receivedTokenList?: { [key: string]: string };
    sentTokenList?: { [key: string]: string };
}

export interface ManualPreApproveResponse {
    telegramId: number;
    error?: string;
    opErrors?: {
        [key: string]: string;
    };
    noOpErrors?: string[];
    txHash?: string;
    txError?: string;
    receivedTokenList?: { [key: string]: string };
    approvePaymaster?: {
        smartAccountsOwner: string;
        smartAccounts: string[];
        router: string;
        token: string;
        allowance: string;
    };
}
