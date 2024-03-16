import { Schema } from "mongoose";
import TokenMarketInfo, { Pool } from "../types/token-market-info";
import { dexDB } from "../db";

const PoolSchema = new Schema<Pool>({
    name: {
        type: String,
        required: true,
        enum: ['Pancake', 'Lynex']
    },
    liquidity: {
        type: String,
        required: true
    },
    fee: {
        type: Number,
        required: false
    },
    feeOtz: {
        type: Number,
        required: false
    },
    feeZto: {
        type: Number,
        required: false
    },
    address: {
        type: String,
        required: true
    },
    sqrtPriceX96: {
        type: String,
        required: false
    },
    ethReserve: {
        type: String,
        required: false
    },
    tokenReserve: {
        type: String,
        required: false
    }
})

const TokenMarketSchema = new Schema<TokenMarketInfo>({
    address: {
        type: String,
        unique: true,
        required: true,
    },
    marketCap: {
        type: String,
        require: true,
    },
    priceETH: {
        type: String,
        required: false,
    },
    priceUSDC: {
        type: String,
        required: false,
    },
    mostLiquidPool: {
        type: PoolSchema,
        required: true
    }
});
const TokenMarketModel = dexDB.model("TokenMarketInfo", TokenMarketSchema);
export default TokenMarketModel;
