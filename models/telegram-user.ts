import { Schema } from "mongoose";
import { telegramDB } from "../db";
import { TelegramUserInfo } from "../types/telegram-user";

const TelegramUserSchema = new Schema<TelegramUserInfo>({
    telegramId: {
        type: Number,
        unique: true,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    chatId: {
        type: Number,
        required: true
    }
})

const TelegramUserModel = telegramDB.model('TelegramUserInfo', TelegramUserSchema);
export default TelegramUserModel;