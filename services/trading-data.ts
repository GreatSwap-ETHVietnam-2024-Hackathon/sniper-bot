import BigNumber from "bignumber.js";
import { base64ToHex } from "../bot/utils"
import TokenMarketModel from "../models/token-market-info";
import TokenMarketInfo from "../types/token-market-info";
import { getTokenConfig } from "./token-config"
import { USDCAddress, WETHAddress } from "../configs/constants";

export async function getMarketInfo(token: string) {
    return (await TokenMarketModel.findOne({ address: token })) as TokenMarketInfo
}

export async function convertUSDCToETH(USDCAmount: string | number, precision: number = 2) {
    const usdcMarketInfo = await getMarketInfo(USDCAddress);
    return new BigNumber(USDCAmount).multipliedBy(usdcMarketInfo.priceETH).toFixed(precision);
}
export async function convertETHToUSDC(ETHAmount: string | number, precision: number = 2) {
    const usdcMarketInfo = await getMarketInfo(USDCAddress);
    return new BigNumber(ETHAmount).dividedBy(usdcMarketInfo.priceETH).toFixed(precision);
}
export async function getETHPrice() {
    const usdcMarketInfo = await getMarketInfo(USDCAddress);
    return new BigNumber(1).dividedBy(usdcMarketInfo.priceETH).toFixed(10);
}

export async function getTextForTradingPanel(tokenBase64: string, isBuying: boolean) {
    const token = base64ToHex(tokenBase64);
    const config = await getTokenConfig(token)
    const marketInfo = await getMarketInfo(token)
    const tax = marketInfo.mostLiquidPool.fee ? marketInfo.mostLiquidPool.fee : (
        isBuying && token < WETHAddress)
        ? marketInfo.mostLiquidPool.feeZto :
        marketInfo.mostLiquidPool.feeOtz
    return `
💎 Token: *${config.name}*
💎 [CA](https://lineascan.build/token/${token}): \`${token}\`
🏦 DEX: *${marketInfo.mostLiquidPool.name}*
🏦 [LP](https://lineascan.build/address/${marketInfo.mostLiquidPool.address}): \`${marketInfo.mostLiquidPool.address}\`
🏦 Liquidity: *${new BigNumber(marketInfo.mostLiquidPool.liquidity).div((new BigNumber(10)).pow(18)).toFixed(2)} ETH*

📊 Current Price: *${new BigNumber(marketInfo.priceUSDC as string).toFixed(6)} USD*
🧢 Market Cap: *${new BigNumber(marketInfo.marketCap as string).toFixed(6)} USD*
    
⚖️ Exchange fee: *${new BigNumber(tax as string | number ?? '0').dividedBy(1e4).toString()}%*    
`

}