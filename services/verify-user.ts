import VerifyUserModel from "../models/verify-user";

export async function getVerifyUserInfo(telegramId: number) {
    return await VerifyUserModel.findOne({ user_id: telegramId });
}
