import { Schema } from "mongoose";
import { telegramDB, verifyDB } from "../db";
import { VerifyUserInfo } from "../types/verify-user";

const VerifyUserSchema = new Schema<VerifyUserInfo>({
    user_id: {
        type: Number,
        unique: true,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        required: true,
    },
    inviteCode: {
        type: String,
        required: false,
    },
});

const VerifyUserModel = telegramDB.model("VerifyUserInfo", VerifyUserSchema);
export default VerifyUserModel;
