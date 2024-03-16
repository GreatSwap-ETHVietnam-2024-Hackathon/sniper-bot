export interface SafetySettings {
    slippage: number,
    minLiquidity: number,
    maxLiquidity: number
}

export const defaultSafetySettings: SafetySettings = {
    slippage: 10,
    minLiquidity: 10,
    maxLiquidity: 100
}