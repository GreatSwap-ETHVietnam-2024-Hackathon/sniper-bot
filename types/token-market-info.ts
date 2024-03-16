import { BigNumberish } from "ethers";

export type Pool = {
    name: 'Pancake' | 'Lynex';
    address: string;
    liquidity: string;
    fee?: BigNumberish;
    feeZto?: BigNumberish;
    feeOtz?: BigNumberish;
    sqrtPriceX96?: string;
    ethReserve?: string;
    tokenReserve?: string;
}

export interface UniV3Pool {
    name: 'Pancake';
    address: string;
    fee: 100 | 500 | 2500 | 10000;
    liquidity: string;
    sqrtPriceX96: string;
}

export interface CamelotV3Pool {
    name: 'Lynex';
    address: string;
    feeZto: BigNumberish;
    feeOtz: BigNumberish;
    liquidity: string;
    sqrtPriceX96: string;
}

export default interface TokenMarketInfo {
    address: string;
    mostLiquidPool: Pool;
    marketCap: string;
    priceETH: string;
    priceUSDC: string;
}
