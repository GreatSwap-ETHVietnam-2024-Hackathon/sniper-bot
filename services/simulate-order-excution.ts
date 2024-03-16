import { AxiosError } from "axios";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { getNames } from "./account-name";
import { getTokenConfig } from "./token-config";
import { getSmartAccountsOwnerById } from "./approval";
import { roundValue } from "./utils";
import { Markup } from "telegraf";
import { closeButton, sendMessage } from "../bot/helper";
import bot, { store } from "../bot";
import { SimulateBuyResponse, SimulateSellResponse } from "../amqp/simulate-orders-consumer";

export async function simulateBuyResponse(data: SimulateBuyResponse) {
    const text = await simulateBuyResponseData(data);
    const telegramId = data.telegramId;

    if (typeof text === "string") sendMessage(bot, telegramId, text, Markup.inlineKeyboard([closeButton]));
    else {
        sendMessage(bot, telegramId, text.resultText, Markup.inlineKeyboard(text.txDetails ? [[Markup.button.url("Tx details", text.txDetails)], [closeButton]] : [[closeButton]]));
    }
}

export async function simulateSellResponse(data: SimulateSellResponse) {
    const text = await simulateSellResponseData(data);

    const telegramId = data.telegramId;

    if (typeof text === "string") sendMessage(bot, telegramId, text, Markup.inlineKeyboard([closeButton]));
    else {
        sendMessage(bot, telegramId, text.resultText, Markup.inlineKeyboard(text.txDetails ? [[Markup.button.url("Tx details", text.txDetails)], [closeButton]] : [[closeButton]]));
    }
}


async function simulateBuyResponseData(res: SimulateBuyResponse) {
    try {
        let smartAccountsOwner = await getSmartAccountsOwnerById(res.telegramId);
        let txDetails: string | undefined = undefined;
        let resultText = ``;
        if (res.receivedTokenList && res.sentTokenList) {
            const smartAccounts = res.noOpErrors as string[];

            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            const tokenConfig = await getTokenConfig(res.token);

            accountNames.forEach((accountName) => {
                const receive = formatUnits(res.receivedTokenList![accountName.smartAccount], tokenConfig.decimals);
                const priceImpact = res.priceImpactList![accountName.smartAccount];
                if (parseFloat(receive) != 0) {
                    resultText += `🟢 #Wallet ${accountName.name ?? accountName.smartAccount}: *Predicted outcome:*
*-${roundValue(formatEther(res.sentTokenList![accountName.smartAccount]))} ETH* 
*+${roundValue(receive)} ${tokenConfig.symbol}*
*Gas: ${roundValue(formatEther(res.gasList![accountName.smartAccount]))} ETH*
*Price Impact: ${priceImpact.startsWith('-') ? '' : '+'}${priceImpact}%*\n\n`;
                } else
                    resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Failed transaction:*
Slippage / Insufficient ETH to pay gas\n\n`;
            });

        }
        if (res.txError) {
            resultText += `🔴 *Transaction failed:*\n`;

            const smartAccounts = res.noOpErrors as string[];
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                resultText += `#${accountName.name ?? accountName.smartAccount} `;
            });
            const value = res.txError;
            resultText += `\nReason: ${(value as string).length > 300 ? (value as string).slice(0, 300) + "..." : value}\n`;
            // resultText += `\nThis error can occur when you do not have enough ETH to pay tx fee`;
        }
        if (res.opErrors && Object.keys(res.opErrors).length > 0) {
            //resultText += `\n🔴 *Failed to build userOp with reasons:*\n\n`;
            const smartAccounts = Object.keys(res.opErrors);
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                const errorText = res.opErrors![accountName.smartAccount] as string;
                resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Failed to build userOp with reasons:* \n${errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText}\n\n`;
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
async function simulateSellResponseData(res: SimulateSellResponse) {
    try {
        let smartAccountsOwner = await getSmartAccountsOwnerById(res.telegramId);
        let txDetails: string | undefined = undefined;
        let resultText = ``;
        if (res.receivedTokenList && res.sentTokenList) {
            const smartAccounts = res.noOpErrors as string[];

            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            const tokenConfig = await getTokenConfig(res.token);

            accountNames.forEach((accountName) => {
                const eth = roundValue(formatEther(res.receivedTokenList![accountName.smartAccount]));
                const priceImpact = res.priceImpactList![accountName.smartAccount];
                const spend = formatUnits(res.sentTokenList![accountName.smartAccount], tokenConfig.decimals);
                if (parseFloat(spend) != 0)
                    resultText += `🟢 #${accountName.name ?? accountName.smartAccount}: *Predicted outcome:*
*${eth.startsWith("-") ? "" : "+"}${roundValue(eth)} ETH* 
*-${roundValue(spend)} ${tokenConfig.symbol}*
*Gas: ${roundValue(formatEther(res.gasList![accountName.smartAccount]))} ETH*
*Price Impact: ${priceImpact.startsWith('-') ? '' : '+'}${priceImpact}%*\n`;
                else
                    resultText += `🔴 #${accountName.name ?? accountName.smartAccount}: *Failed transaction:*
Slippage / Insufficient ETH to pay gas\n`;
            });

        }
        if (res.txError) {
            resultText += `🔴 *Transaction failed:*\n`;

            const smartAccounts = res.noOpErrors as string[];
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                resultText += `#${accountName.name ?? accountName.smartAccount} `;
            });
            const value = res.txError;
            resultText += `\nReason: ${(value as string).length > 300 ? (value as string).slice(0, 300) + "..." : value}\n`;
            // resultText += `\nThis error can occur when you do not have enough ETH to pay tx fee`;
        }
        if (res.opErrors && Object.keys(res.opErrors).length > 0) {
            resultText += "";

            const smartAccounts = Object.keys(res.opErrors);
            const accountNames = await getNames(smartAccountsOwner, smartAccounts);

            accountNames.forEach((accountName) => {
                const errorText = res.opErrors![accountName.smartAccount] as string;
                resultText += `🔴 #${accountName.name ?? accountName.smartAccount}: *Failed to build userOp with reasons:*\n ${errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText}\n\n`;
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

