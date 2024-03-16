import { Schema } from "mongoose";
import { TxLastest } from "../types/tx-lastest";
import { telegramDB } from "../db";

const TxLastestSchema = new Schema<TxLastest>({
    user_id: {
        type: Number,
        required: true,
        unique: true,
    },
    time: {
        type: Date,
        required: true,
    },
}).index({ user_id: 1 });

const TxLastestModel = telegramDB.model("TxLastest", TxLastestSchema);

export default TxLastestModel;
