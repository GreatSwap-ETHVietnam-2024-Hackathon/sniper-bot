import { ethers } from "ethers";
import { Pool } from "../types/token-market-info";

export const WETHAddress = "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f";
export const USDCAddress = "0x176211869ca2b568f2a7d4ee941e073a821ee1ff";
export const MulticallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const limitTimeEachRequest = 5;
export const lengthReferralCode = 10;

//const RPCs = ["https://arb1.arbitrum.io/rpc", "https://arbitrum.blockpi.network/v1/rpc/public", "https://arb-pokt.nodies.app"];
const RPCs = ["http://0.0.0.0:9000"];

export async function getBestRPC() {
    async function ping(rpc: string) {
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        await provider.getNetwork();
        return provider;
    }

    return await Promise.race(RPCs.map((rpc) => ping(rpc)));
}

export const SupportedRouters = {
    UniswapV3Router: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    CamelotV3Router: "0x3921e8cb45B17fC029A0a6dE958330ca4e583390",
    PaymasterAddress: "0x3E8E188540eF041Cd4A2BD1d8DeB638Ab30c697C",
};

export function poolToRouter(pool: Pool) {
    if (pool.name === "Pancake") return SupportedRouters.UniswapV3Router;
    else return SupportedRouters.CamelotV3Router;
}
