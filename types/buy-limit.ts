import { BigNumberish } from "ethers";

export interface BuyLimitOrder {
    _id: string;
    telegramId: number;
    smartAccountsOwner: string;
    router: string;
    token: string;
    ethSpend: BigNumberish;
    triggeredByPrice: boolean;
    triggerValue: BigNumberish;
    slippage: number;
    expiryDate: number;
    participatingWallets: string[];
    usePrivRelayer?: boolean;
}