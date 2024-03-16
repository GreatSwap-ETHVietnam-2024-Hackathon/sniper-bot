import { Schema } from "mongoose";
import { limitOrdersDB } from "../db";
import { SellLimitOrder } from "../types/sell-limit";

const SellLimitOrderSchema = new Schema<SellLimitOrder>({
    telegramId: {
        type: Number,
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        index: true,
    },
    smartAccountsOwner: {
        type: String,
        required: true,
        index: true,
    },
    router: {
        type: String,
        required: true,
    },
    tokenSpend: {
        type: String,
        required: false,
    },
    sellPercent: {
        type: String,
        required: false,
    },
    isTakeProfit: {
        type: Boolean,
        required: true,
    },
    triggeredByPrice: {
        type: Boolean,
        required: true,
    },
    triggerValue: {
        type: Number,
        required: true,
    },
    slippage: {
        type: Number,
        required: true,
    },
    expiryDate: {
        type: Number,
        required: true,
    },
    participatingWallets: {
        type: [String],
        required: true,
    },
    usePrivRelayer: {
        type: Boolean,
        required: false,
    },
}).index({ telegramId: 1 });

const SellLimitOrderModel = limitOrdersDB.model("SellLimitOrder", SellLimitOrderSchema);
export default SellLimitOrderModel;
