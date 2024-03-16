import { AxiosError } from "axios";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { getNames } from "./account-name";
import { getTokenConfig } from "./token-config";
import { getSmartAccountsOwnerById } from "./approval";
import { checkText, roundValue } from "./utils";
import { ManualBuyResponse, ManualPreApproveResponse, ManualSellResponse } from "../amqp/manual-orders-consumer";
import { Markup } from "telegraf";
import { closeButton, sendMessage } from "../bot/helper";
import bot, { store } from "../bot";
import { SupportedRouters } from "../configs/constants";
import { comsumerPaymaster } from "../bot/controllers/wallet/tokenPaymaster";

export async function buyResponse(data: ManualBuyResponse) {
    const text = await buyResponseData(data);

    const telegramId = data.telegramId;

    if (typeof text === "string") sendMessage(bot, telegramId, text, Markup.inlineKeyboard([closeButton]));
    else {
        sendMessage(
            bot,
            telegramId,
            text.resultText,
            Markup.inlineKeyboard(text.txDetails ? [[Markup.button.url("Tx details", text.txDetails)], [closeButton]] : [[closeButton]])
        );
    }
}

export async function sellResponse(data: ManualSellResponse) {
    const text = await sellResponseData(data);

    const telegramId = data.telegramId;

    if (typeof text === "string") sendMessage(bot, telegramId, text, Markup.inlineKeyboard([closeButton]));
    else {
        sendMessage(
            bot,
            telegramId,
            text.resultText,
            Markup.inlineKeyboard(text.txDetails ? [[Markup.button.url("Tx details", text.txDetails)], [closeButton]] : [[closeButton]])
        );
    }
}

export async function preApproveResponse(data: ManualPreApproveResponse) {
    console.log(" data = ", data);
    if (data.approvePaymaster!.router == SupportedRouters.PaymasterAddress) {
        comsumerPaymaster(data);
        return;
    }

    const text = await preApproveResponeData(data);

    const telegramId = data.telegramId;

    if (typeof text === "string") sendMessage(bot, data.telegramId, text, Markup.inlineKeyboard([closeButton]));
    else {
        sendMessage(
            bot,
            data.telegramId,
            text.resultText,
            Markup.inlineKeyboard(text.txDetails ? [[Markup.button.url("Tx details", text.txDetails)], [closeButton]] : [[closeButton]])
        );
    }
}

async function buyResponseData(res: ManualBuyResponse) {
    try {
        let smartAccountsOwner = await getSmartAccountsOwnerById(res.telegramId);
        let txDetails: string | undefined = undefined;
        let resultText = ``;
        if (res.txHash && res.receivedTokenList && res.sentTokenList) {
            const smartAccounts = res.noOpErrors as string[];

            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            const tokenConfig = await getTokenConfig(res.token);

            accountNames.forEach((accountName) => {
                const receive = formatUnits(res.receivedTokenList![accountName.smartAccount], tokenConfig.decimals);
                if (parseFloat(receive) != 0) {
                    resultText += `🟢 #Wallet ${accountName.name ?? accountName.smartAccount}: *Successful transaction:*
*-${roundValue(formatEther(res.sentTokenList![accountName.smartAccount]))} ETH* 
*+${roundValue(receive)} ${tokenConfig.symbol}*\n\n`;
                } else
                    resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Failed transaction:*
Slippage / Insufficient ETH to pay gas\n\n`;
            });

            txDetails = `https://arbiscan.io/tx/${res.txHash}`;
        }
        if (res.txError) {
            resultText += `🔴 `;

            const smartAccounts = res.noOpErrors as string[];
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                resultText += `#Wallet ${accountName.name ?? accountName.smartAccount} `;
            });
            resultText += `*Transaction failed:*\n`;

            const value = res.txError;
            const newValue = checkText(value);
            //  const value = JSON.parse(res.txError);
            resultText += `\nReason: ${(newValue as string).length > 300 ? (newValue as string).slice(0, 300) + "..." : newValue}\n`;
            resultText += `\nThis error can occur when either your abstract wallet or relayer wallet doesn't have enough ETH to pay the gas fee \n`;
        }
        if (res.opErrors && Object.keys(res.opErrors).length > 0) {
            //resultText += `\n🔴 *Failed to build userOp with reasons:*\n\n`;
            const smartAccounts = Object.keys(res.opErrors);
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                const errorText = checkText(res.opErrors![accountName.smartAccount] as string);
                resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Failed to build userOp with reasons:* \n${
                    errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText
                }\n\n`;
            });
        }

        return {
            resultText,
            txDetails,
        };
    } catch (err) {
        return `🔴 ${(err as Error).message}`;
    }
}
async function sellResponseData(res: ManualSellResponse) {
    try {
        let smartAccountsOwner = await getSmartAccountsOwnerById(res.telegramId);
        let txDetails: string | undefined = undefined;
        let resultText = ``;
        if (res.txHash && res.receivedTokenList && res.sentTokenList) {
            const smartAccounts = res.noOpErrors as string[];

            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            const tokenConfig = await getTokenConfig(res.token);

            accountNames.forEach((accountName) => {
                const eth = roundValue(formatEther(res.receivedTokenList![accountName.smartAccount]));
                const spend = formatUnits(res.sentTokenList![accountName.smartAccount], tokenConfig.decimals);
                if (parseFloat(spend) != 0)
                    resultText += `🟢 #${accountName.name ?? accountName.smartAccount}: *Successful transaction:*
*${eth.startsWith("-") ? "" : "+"}${roundValue(eth)} ETH* 
*-${roundValue(spend)} ${tokenConfig.symbol}*\n`;
                else
                    resultText += `🔴 #${accountName.name ?? accountName.smartAccount}: *Failed transaction:*
Slippage / Insufficient ETH to pay gas\n`;
            });

            txDetails = `https://arbiscan.io/tx/${res.txHash}`;
        }
        if (res.txError) {
            resultText += `🔴 *Transaction failed:*\n`;

            const smartAccounts = res.noOpErrors as string[];
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                resultText += `#${accountName.name ?? accountName.smartAccount} `;
            });
            const value = checkText(res.txError);
            resultText += `\nReason: ${(value as string).length > 300 ? (value as string).slice(0, 300) + "..." : value}\n`;
            resultText += `\nThis error can occur when either your abstract wallet or relayer wallet doesn't have enough ETH to pay the gas fee\n`;
        }
        if (res.opErrors && Object.keys(res.opErrors).length > 0) {
            resultText += "";

            const smartAccounts = Object.keys(res.opErrors);
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                const errorText = checkText(res.opErrors![accountName.smartAccount] as string);
                resultText += `🔴 #${accountName.name ?? accountName.smartAccount}: *Failed to build userOp with reasons:*\n ${
                    errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText
                }\n\n`;
            });
        }

        return {
            resultText,
            txDetails,
        };
    } catch (err) {
        return `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`;
    }
}
async function preApproveResponeData(res: ManualPreApproveResponse) {
    try {
        let smartAccountsOwner = await getSmartAccountsOwnerById(res.telegramId);
        let txDetails: string | undefined = undefined;
        let resultText = ``;
        if (res.txHash) {
            const smartAccounts = res.noOpErrors as string[];

            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                resultText += `🟢 #${accountName.name ?? accountName.smartAccount}: *Pre approved*\n`;
            });

            txDetails = `https://arbiscan.io/tx/${res.txHash}`;
        }
        if (res.txError) {
            resultText += `🔴 *Transaction failed:*\n`;

            const smartAccounts = res.noOpErrors! as string[];
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
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

        return {
            resultText,
            txDetails,
        };
    } catch (err) {
        return `🔴 ${(err as AxiosError).response?.data ?? (err as Error).message}`;
    }
}
