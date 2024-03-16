import { Schema } from "mongoose";
import { telegramDB } from "../db";
import { AccountName, AccountNameList } from "../types/account-name";


const AccountNameSchema = new Schema<AccountName>({
    smartAccount: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: false
    }
})

const AccountNameListSchema = new Schema<AccountNameList>({
    smartAccountsOwner: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    nameList: {
        type: [AccountNameSchema],
        required: true,
        default: []
    }
})

const AccountNameListModel = telegramDB.model('AccountNameList', AccountNameListSchema);
export default AccountNameListModel;