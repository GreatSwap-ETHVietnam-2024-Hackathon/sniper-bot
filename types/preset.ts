export interface Preset {
    manualBuy: number[],
    manualSell: number[],
    buyLimit: number[],
    sellLimit: number[],
}

export const defaultPreset: Preset = {
    manualBuy: [0.01, 0.1, 0.5, 1],
    manualSell: [25, 50, 75, 100],
    buyLimit: [-1, -2, -3, -5, -10],
    sellLimit: [1, 2, 3, -1, -2]
}