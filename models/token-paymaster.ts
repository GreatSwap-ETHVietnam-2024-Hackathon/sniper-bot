import { Schema } from "mongoose";
import { dexDB } from "../db";
import { Token, TokenPaymaster } from "../types/token-paymaster";

export const TokenSchema = new Schema<Token>({
    symbol: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
        unique: true,
    },
});

const TokenPaymasterSchema = new Schema<TokenPaymaster>({
    token: {
        type: TokenSchema,
        required: false,
    },
    active: {
        type: Boolean,
        required: true,
        default: true,
    },
});

const TokenPaymasterModel = dexDB.model("Token-Paymaster", TokenPaymasterSchema);

export default TokenPaymasterModel;
