import { Channel } from "amqplib";
import { BuyLimitOrder } from "../types/buy-limit";
import { SellLimitOrder } from "../types/sell-limit";
import { handleLimitOrdersExecution } from "../services/limit-order-execution";
import { limitOrdersConfig } from ".";

export interface LimitOrderResponse {
    isBuyOrder: boolean,
    order: BuyLimitOrder | SellLimitOrder,
    error?: string,
    opErrors?: {
        [key: string]: string
    },
    noOpErrors?: string[],
    txHash?: string,
    txError?: string,
    receivedTokenList?: { [key: string]: string },
    sentTokenList?: { [key: string]: string },
}

export class LimitOrderConsumer {
    channel: Channel;

    constructor(channel: Channel) {
        this.channel = channel;

        // buy
        this.channel.consume(limitOrdersConfig.RESPONSE_QUEUE, (message: any) => {
            if (message) {
                const data: LimitOrderResponse = JSON.parse(message.content);
                handleLimitOrdersExecution(data);
                this.channel.ack(message);
            }
        });
    }
}