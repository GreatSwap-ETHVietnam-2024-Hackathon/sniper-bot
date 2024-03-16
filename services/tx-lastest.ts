import TxLastestModel from "../models/tx-lastest";

export async function getTxLastestByTelegramId(telegramId: any) {
    try {
        const data = await TxLastestModel.findOne({ user_id: telegramId }).exec();
        return data?.time;
    } catch (error) {
        return undefined;
    }
}

export async function setTxLastestByTelegramId(telegramId: any) {
    const currentTime = new Date();
    try {
        await TxLastestModel.updateOne({ user_id: telegramId }, { time: currentTime }, { upsert: true }).exec();
    } catch (error) {}
}
