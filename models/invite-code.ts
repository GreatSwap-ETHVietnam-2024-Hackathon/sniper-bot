import { Schema } from "mongoose";
import { telegramDB } from "../db";
import { InviteCode, UsageInviteCode } from "../types/invite-code";

const UsageInviteCodeSchema = new Schema<UsageInviteCode>({
    usedBy: {
        type: Number,
        required: true,
    },
    usedAt: {
        type: Date,
        required: true,
    },
});

const InviteCodeSchema = new Schema<InviteCode>({
    code: {
        type: Number,
        unique: true,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    maxUsages: {
        type: Number,
        required: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    usages: {
        type: [UsageInviteCodeSchema],
        required: true,
        default: [],
    },
});

const InviteCodeModel = telegramDB.model("InviteCode", InviteCodeSchema);
export default InviteCodeModel;
