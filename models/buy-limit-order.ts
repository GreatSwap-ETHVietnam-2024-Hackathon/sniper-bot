import { Schema } from "mongoose";
import { limitOrdersDB } from "../db";
import { BuyLimitOrder } from "../types/buy-limit";

const BuyLimitOrderSchema = new Schema<BuyLimitOrder>({
    telegramId: {
        type: Number,
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        index: true
    },
    smartAccountsOwner: {
        type: String,
        required: true,
        index: true
    },
    router: {
        type: String,
        required: true,
    },
    ethSpend: {
        type: String,
        required: true
    },
    triggeredByPrice: {
        type: Boolean,
        required: true
    },
    triggerValue: {
        type: Number,
        required: true
    },
    slippage: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: Number,
        required: true
    },
    participatingWallets: {
        type: [String],
        required: true
    },
    usePrivRelayer: {
        type: Boolean,
        required: false
    }
})

const BuyLimitOrderModel = limitOrdersDB.model('BuyLimitOrder', BuyLimitOrderSchema);
export default BuyLimitOrderModel;