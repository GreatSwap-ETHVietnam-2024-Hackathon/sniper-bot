import { Schema } from "mongoose";
import { Approval } from "../types/approval";
import { approvalDB } from "../db";

const ApprovalSchema = new Schema<Approval>(
    {
        smartAccountsOwner: {
            type: String,
            required: true,
            index: true
        },
        smartAccounts: {
            type: [String],
            required: true,
        },
        telegramId: {
            type: Number,
            required: true,
            index: true
        },
        salt: {
            type: Number,
            required: true,
            index: true
        },
        tokens: {
            type: [String],
            required: true
        },
        locked: {
            type: Boolean,
            required: true
        },
        connected: {
            type: Boolean,
            required: true,
            default: false
        }
    }
)

const ApprovalModel = approvalDB.model("Approval", ApprovalSchema)

export default ApprovalModel;