import { Schema } from "mongoose";
import { dexDB } from "../db";
import { TokenBalance } from "../types/token-balance";

const TokenBalanceSchema = new Schema<TokenBalance>({
    telegramId: {
        type: Number,
        required: true
    },
    smartAccounts: {
        type: [String],
        required: true
    },
    balances: {
        type: [String],
        required: true
    },
    token: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

TokenBalanceSchema.index({ "updatedAt": 1 }, { expireAfterSeconds: 10 });
const TokenBalanceModel = dexDB.model('TokenBalance', TokenBalanceSchema);

export default TokenBalanceModel;