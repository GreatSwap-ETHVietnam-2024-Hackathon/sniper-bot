import { Markup, Telegraf } from "telegraf";
import bot, { BotContext } from "../..";
import { getSmartAccountsOwner } from "../../../services/approval";
import { getAddressOfActiveToken, getListTokenPaymaster } from "../../../services/token-paymaster";
import { closeButton, edit, sendMessage } from "../../helper";
import { handlePreApprovePaymaster } from "./approve";
import { hexToBase64 } from "../../utils";
import { ManualPreApproveResponse } from "../../../amqp/manual-orders-consumer";
import { chooseToken } from "../trade";
import { inlineKeyboard } from "telegraf/typings/markup";
import { checkText } from "../../../services/utils";
import { addTokenToListTokenApprove, getTokenFees, setTokenFee } from "../../../services/token-paymaster-user";
import { getNames } from "../../../services/account-name";
import { Token } from "../../../types/token-paymaster";

async function tokenPaymasterSettingPanel(smartAccountsOwner: string, walletId: number, walletAddress: string) {
    try {
        //@ts-ignore

        const smartAccount = await getNames(smartAccountsOwner!, [walletAddress]);
        const statusEmoij: any[] = ["🔴", "🟢", "⚪"];

        let data: any[] = await getDataTokenPaymasterAccount(smartAccountsOwner!, walletAddress);
        console.log("data = ", data);
        const msg = ` Choose Fee token
Wallet name:*${smartAccount[0].name ?? "Unnamed"}*
Wallet address:\`${walletAddress}\`

The fee token is the amount you need to pay for your transactions. We offer various types of fees depending on user requirements. You can use either native tokens or ERC-20 tokens for this purpose.

We currently support a number of token types as below.
   🟢: Fee is being paid by this token
   🔴: Fee can be used by this token, no transaction required to activate 
   ⚪: You have never used this token to pay fees, needs 1 transaction to activate
    `;

        const inlineKeyboard = Markup.inlineKeyboard([
            ...data.map((data, index) => {
                return [
                    Markup.button.callback(
                        ` ${statusEmoij[data.status]} ${data.name}`,
                        `Set Token Fee:${walletId}:${walletAddress}:${data.name}`
                    ),
                ];
            }),
            [Markup.button.callback(`Back`, `Setting Detail Wallet:${walletId}`), closeButton],
        ]);
        return {
            msg,
            inlineKeyboard,
        };
    } catch (error) {
        console.log("Error ", error);
        return {
            msg: "ERROR: #TP00",
            inlineKeyboard: Markup.inlineKeyboard([[closeButton]]),
        };
    }
}

export async function comsumerPaymaster(res: ManualPreApproveResponse) {
    console.log("data = ", res);
    let resultText = ``;
    const smartAccountsOwner = res.approvePaymaster!.smartAccountsOwner;
    if (res.txHash) {
        resultText += ` Wallet register fee successful `;
        await addTokenToListTokenApprove(
            res.approvePaymaster!.smartAccountsOwner,
            res.approvePaymaster!.smartAccounts[0],
            res.approvePaymaster!.token
        );

        await sendMessage(bot, res.telegramId, resultText, Markup.inlineKeyboard([closeButton]));
        const { msg, inlineKeyboard } = await tokenPaymasterSettingPanel(
            res.approvePaymaster!.smartAccountsOwner,
            1,
            res.approvePaymaster!.smartAccounts[0]
        );
        await sendMessage(bot, res.telegramId, msg, inlineKeyboard);
        return;
    }
    if (res.txError) {
        resultText += `🔴 *Transaction failed:*\n`;
        const smartAccounts = res.noOpErrors! as string[];
        const accountNames = await getNames(smartAccountsOwner, smartAccounts);
        accountNames.forEach((accountName: any) => {
            resultText += `#${accountName.name ?? accountName.smartAccount} `;
        });
        const value = checkText(res.txError);
        resultText += `\nReason: ${(value as string).length > 300 ? (value as string).slice(0, 300) + "..." : value}\n`;
        resultText += `\nThis error can occur when either your abstract wallet or relayer wallet doesn't have enough ETH to pay the gas fee\n`;
    }
    if (res.opErrors && Object.keys(res.opErrors).length > 0) {
        resultText += `\n🔴 *Failed to build userOp with reasons:*\n\n`;
        const smartAccounts = Object.keys(res.opErrors);
        const accountNames = await getNames(smartAccountsOwner, smartAccounts);
        accountNames.forEach((accountName) => {
            const errorText = checkText(res.opErrors![accountName.smartAccount] as string);
            resultText += `🔴 #${accountName.name ?? accountName.smartAccount}\n${
                errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText
            }\n`;
        });
    }
    sendMessage(bot, res.telegramId, resultText, Markup.inlineKeyboard([closeButton]));
}

async function onSetTokenFee(ctx: BotContext) {
    //@ts-ignore
    const args = ctx.callbackQuery.data.split(":");
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    const addressWallet = args[2];
    const tokenName = args[3];
    console.log("addresswallet = ", args[2]);
    console.log("tokenName = ", args[3]);

    let feeTokenData = (await getTokenFees(smartAccountsOwner!, [addressWallet]))[0];

    let approved = false;

    for (let i = 0; i < feeTokenData.listTokenApprove.length; i++) {
        if (feeTokenData.listTokenApprove[i].symbol === args[3]) {
            approved = true;
            break;
        }
    }

    if (approved) {
        await setTokenFee(smartAccountsOwner!, addressWallet, tokenName);
        const { msg, inlineKeyboard } = await tokenPaymasterSettingPanel(smartAccountsOwner!, args[1], addressWallet);
        edit(ctx, msg, inlineKeyboard);
    } else {
        const tokenAddress = await getAddressOfActiveToken(tokenName);
        console.log("error ", tokenAddress);
        await handlePreApprovePaymaster(ctx, [addressWallet], hexToBase64(tokenAddress!));
    }
}

export async function onChangingTokenPaymasterSetting(bot: Telegraf<BotContext>) {
    bot.action(/Setting Token Fee./, async (ctx) => {
        //@ts-ignore
        const args = ctx.callbackQuery.data.split(":");
        const walletId = args[1];
        const walletAddress = args[2];
        const smartAccountsOwner = await getSmartAccountsOwner(ctx);
        const { msg, inlineKeyboard } = await tokenPaymasterSettingPanel(smartAccountsOwner!, walletId, walletAddress);
        edit(ctx, msg, inlineKeyboard);
    });
    bot.action(/Set Token Fee./, async (ctx) => {
        await onSetTokenFee(ctx);
    });
}

const defaultPaymasterToken: Token = {
    symbol: "ETH",
    address: "0x",
};

export async function getDataTokenPaymasterAccount(smartAccountsOwner: string, smartAccount: string) {
    const listTokenPaymaster = await getListTokenPaymaster();
    const dataTokenPaymasterAccount = (await getTokenFees(smartAccountsOwner, [smartAccount]))[0];

    let tokenChoosing = dataTokenPaymasterAccount.feeToken;
    let listTokenApprove = dataTokenPaymasterAccount.listTokenApprove;

    // check usecase 10s cache

    // tokenChoosing is remove from list Token Paymaster
    const existingToken = listTokenPaymaster.find((item: Token) => item.address === tokenChoosing.address);
    if (!existingToken) {
        //set to default paymaster Token
        await setTokenFee(smartAccountsOwner, smartAccount, "ETH");
        tokenChoosing = defaultPaymasterToken;
    }
    // remove
    const tokensToRemove: Token[] = [];
    for (const tokenApprove of listTokenApprove) {
        if (!listTokenPaymaster.some((tokenPaymaster: Token) => tokenPaymaster.address === tokenApprove.address)) {
            tokensToRemove.push(tokenApprove);
        }
    }
    // delete token
    for (const tokenToRemove of tokensToRemove) {
        const index = listTokenApprove.indexOf(tokenToRemove);
        if (index !== -1) {
            listTokenApprove.splice(index, 1);
        }
    }

    let result = [];

    for (const token of listTokenPaymaster) {
        let status = feeToken.NOT_ACTIVE;
        const existingTokenInListApprove = listTokenApprove.find((item: Token) => item.address === token.address);
        if (existingTokenInListApprove) status = feeToken.DISABLE;
        if (token.address == tokenChoosing.address) status = feeToken.ENABLE;
        result.push({
            name: token.symbol,
            address: token.address,
            status: status,
        });
    }

    return result;
}
const feeToken = {
    DISABLE: 0,
    ENABLE: 1,
    NOT_ACTIVE: 2,
};
