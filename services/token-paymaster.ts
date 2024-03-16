import { USDCAddress, WETHAddress } from "../configs/constants";
import TokenPaymasterModel from "../models/token-paymaster";
import { Token } from "../types/token-paymaster";

export const ethToken: Token = {
    symbol: "ETH",
    address: "0x",
};

async function addTokenToDatabase(token: Token) {
    try {
        const existingToken = await TokenPaymasterModel.findOne({ "token.symbol": token.symbol });

        if (existingToken) {
            return;
        }
        const newToken = new TokenPaymasterModel({
            token: token,
            active: true,
        });
        await newToken.save();
    } catch (error) {}
}

export async function addDefaultToken() {
    await addTokenToDatabase(ethToken);
    const WETH: Token = {
        symbol: "WETH",
        address: WETHAddress,
    };
    const CAKE: Token = {
        symbol: "Cake",
        address: "0x0d1e753a25ebda689453309112904807625befbe",
    };
    await addTokenToDatabase(WETH);
    await addTokenToDatabase(CAKE);
}

export async function getListTokenPaymaster() {
    try {
        const tokens = await TokenPaymasterModel.find({ active: true });
        return tokens.map((token) => token.token);
    } catch (error) {
        console.error("Error getting token list from the database:", error);
        return [];
    }
}

export async function getTokenByName(name: string) {
    const token = await TokenPaymasterModel.findOne({ active: true, "token.symbol": name });
    return token?.token;
}

export async function getTokenByAddress(address: string) {
    const token = await TokenPaymasterModel.findOne({ active: true, "token.address": address });
    return token?.token;
}

export async function getAddressOfActiveToken(tokenName: string) {
    try {
        const tokenPaymaster = await TokenPaymasterModel.findOne({
            "token.symbol": tokenName,
            active: true,
        });
        if (!tokenPaymaster) {
            return null;
        }

        return tokenPaymaster.token.address;
    } catch (error) {
        return null;
    }
}
