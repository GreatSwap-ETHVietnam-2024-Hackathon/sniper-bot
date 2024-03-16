import { BigNumberish } from "ethers";

export interface SellLimitOrder {
    _id: string;
    telegramId: number;
    smartAccountsOwner: string;
    router: string;
    token: string;
    tokenSpend: BigNumberish | undefined;
    sellPercent: BigNumberish | undefined;
    isTakeProfit: boolean;
    triggeredByPrice: boolean;
    triggerValue: BigNumberish;
    slippage: number;
    expiryDate: number;
    participatingWallets: string[];
    usePrivRelayer?: boolean;
}