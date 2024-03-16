import { Channel } from "amqplib";

import { simulateOrdersConfig } from ".";
import { simulateBuyResponse, simulateSellResponse } from "../services/simulate-order-excution";

export class SimulateOrderConsumer {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel;

        // buy
        this.channel.consume(simulateOrdersConfig.BUY_RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: SimulateBuyResponse = JSON.parse(message.content);
                simulateBuyResponse(data);
                this.channel.ack(message);
            }
        });

        // sell
        this.channel.consume(simulateOrdersConfig.SELL_RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: SimulateSellResponse = JSON.parse(message.content);
                simulateSellResponse(data);
                this.channel.ack(message);
            }
        });
    }
}

export interface SimulateBuyResponse {
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
    priceImpactList?: { [key: string]: string };
    gasList?: { [key: string]: string };
}

export interface SimulateSellResponse {
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
    priceImpactList?: { [key: string]: string };
    gasList?: { [key: string]: string };
}
