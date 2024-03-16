import { Schema } from "mongoose";
import { TokenConfig } from "../types/token-config";
import { dexDB } from "../db";

const TokenConfigSchema = new Schema<TokenConfig>({
    address: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    decimals: {
        type: Number,
        required: true
    }
})

const TokenConfigModel = dexDB.model('TokenConfig', TokenConfigSchema);
export default TokenConfigModel;