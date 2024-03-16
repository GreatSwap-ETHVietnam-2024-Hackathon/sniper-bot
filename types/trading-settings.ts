export enum TradingMode {
    MANUAL_BUY,
    MANUAL_SELL,
    SIMULATE_BUY,
    SIMULATE_SELL,
    BUY_LIMIT,
    SELL_LIMIT
}

export enum LimitMeasure {
    MARKET_CAP,
    TOKEN_PRICE
}

export interface BuyLimitSettings {
    ethSpend: number,
    ethToBuy: number,
    active: number,
    measure: LimitMeasure
}

export interface SellLimitSettings {
    isChoosingSpending: boolean,
    spendByPercent: boolean,
    spendingAmount: number,
    spendingPercent: number,
    active: number,
    measure: LimitMeasure
}

export interface TradingSettings {
    messageId?: number,
    tradingMode: TradingMode,
    slippage?: number,
    participatingWallets: string[],
    buyLimitSettings: BuyLimitSettings,
    sellLimitSettings: SellLimitSettings
}

export const defaultTradingSettings: TradingSettings = {
    tradingMode: TradingMode.MANUAL_BUY,
    slippage: undefined,
    participatingWallets: [],
    buyLimitSettings: {
        ethSpend: 0.1,
        ethToBuy: 0.1,
        active: 24,
        measure: LimitMeasure.TOKEN_PRICE
    },
    sellLimitSettings: {
        isChoosingSpending: false,
        spendByPercent: true,
        spendingAmount: 10,
        spendingPercent: 100,
        active: 24,
        measure: LimitMeasure.TOKEN_PRICE
    }
}