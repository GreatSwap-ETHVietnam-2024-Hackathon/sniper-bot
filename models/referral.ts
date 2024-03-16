import { Schema } from "mongoose";
import { Referral } from "../types/referral";
import { telegramDB } from "../db";

const ReferralSchema = new Schema<Referral>({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
    },
    code: {
        type: String,
        required: false,
    },
    refCount: {
        type: Number,
        required: true,
        default: 0,
    },
    referrer: {
        type: Number,
        required: false,
    },
}).index({ telegramId: 1 });

const ReferralModel = telegramDB.model("Referral", ReferralSchema);

export default ReferralModel;
