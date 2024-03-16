import { ethers } from "ethers";
import TokenConfigModel from "../models/token-config";
import { TokenConfig } from "../types/token-config";

export async function getTokenConfig(token: string) {
    const config = await TokenConfigModel.findOne({ address: token });
    if (!config) {
        const defaultConfig: TokenConfig = {
            name: 'UNKNOWN',
            decimals: 0,
            address: ethers.constants.AddressZero,
            symbol: 'UNKNOWN'
        }
        return defaultConfig
    }
    return config as TokenConfig
}

export async function getTokenConfigList(tokens: string[]) {
    const configs: TokenConfig[] = []
    for (let i = 0; i < tokens.length; i++) {
        configs.push(await getTokenConfig(tokens[i]))
    }
    return configs
}