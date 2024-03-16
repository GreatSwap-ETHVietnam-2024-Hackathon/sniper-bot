import { lengthReferralCode } from "../configs/constants";
import ReferralModel from "../models/referral";
import * as referralCodes from "referral-codes";

export async function getReferralInfo(telegramId: any) {
    try {
        const referral = await ReferralModel.findOne({ telegramId });
        if (!referral) {
            const referral = await createReferralInfo(telegramId);
            return referral;
        }
        return referral;
    } catch (error) {}
}

export async function saveReferralInfo(telegramId: number, referralCode: string) {
    const referralData = await getReferralInfo(telegramId);
    if (referralData!.referrer == undefined) {
        const Parent = await ReferralModel.findOne({ code: referralCode });
        if (!Parent) return;
        if (Parent.telegramId == telegramId) return;
        referralData!.referrer = Parent.telegramId;
        Parent.refCount++;
        await Parent.save();
        await referralData?.save();
    }
}

export async function createReferralInfo(telegramId: any) {
    try {
        let code;
        let existingReferral;
        do {
            const codes = referralCodes.generate({
                length: lengthReferralCode,
                count: 1,
                charset: referralCodes.Charset.ALPHANUMERIC,
            });
            code = codes[0];
            existingReferral = await ReferralModel.findOne({ code });
        } while (existingReferral);

        const newReferral = await ReferralModel.create({
            code: code,
            telegramId: telegramId,
            refCount: 0,
        });
        return newReferral;
    } catch (error) {}
}
