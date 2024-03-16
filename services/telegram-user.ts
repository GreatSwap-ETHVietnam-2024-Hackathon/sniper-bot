import TelegramUserModel from "../models/telegram-user";
import { TelegramUserInfo } from "../types/telegram-user";

export async function getTelegramUserInfo(telegramId: number) {
    return await TelegramUserModel.findOne({ telegramId });
}

export async function addNewTelegramUser(user: TelegramUserInfo) {
    await TelegramUserModel.updateOne(
        {
            telegramId: user.telegramId,
        },
        {
            ...user
        }, {
        upsert: true
    }
    )
}