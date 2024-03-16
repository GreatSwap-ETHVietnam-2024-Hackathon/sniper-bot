import { Schema } from "mongoose";
import { SmartAccount, TokenPaymasterUser } from "../types/token-paymaster-user";
import { TokenSchema } from "./token-paymaster";
import { ethToken } from "../services/token-paymaster";
import { TokenPaymaster } from "../types/token-paymaster";
import { telegramDB } from "../db";

const SmartAccountSchema = new Schema<SmartAccount>({
    address: {
        type: String,
        required: true,
    },
    feeToken: {
        type: TokenSchema,
        default: ethToken,
    },
    listTokenApproved: {
        type: [TokenSchema],
        default: [ethToken],
    },
});

const TokenPaymasterUserSchema = new Schema<TokenPaymasterUser>({
    smartAccountsOwner: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    smartAccounts: {
        type: [SmartAccountSchema],
        required: true,
        default: [],
    },
});

export const TokenPaymasterUserModel = telegramDB.model("Token-Paymaster-User", TokenPaymasterUserSchema);
