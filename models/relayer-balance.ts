import { Schema } from "mongoose";
import { dexDB } from "../db";
import { RelayerBalance } from "../types/relayer-balance";

const RelayerBalanceSchema = new Schema<RelayerBalance>({
    relayer: {
        type: String,
        required: true
    },
    balance: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

RelayerBalanceSchema.index({ "updatedAt": 1 }, { expireAfterSeconds: 10 });
const RelayerBalanceModel = dexDB.model('RelayerBalance', RelayerBalanceSchema);

export default RelayerBalanceModel;