import { formatEther, formatUnits } from "ethers/lib/utils";
import { SellLimitOrder } from "../types/sell-limit";
import { getNames } from "./account-name";
import { getTokenConfig } from "./token-config";
import { getTelegramUserInfo } from "./telegram-user";
import bot from "../bot";
import { closeButton } from "../bot/helper";
import { Markup } from "telegraf";
import { checkText, roundValue } from "./utils";
import { LimitOrderResponse } from "../amqp/limit-orders-consumer";

export async function handleLimitOrdersExecution(message: LimitOrderResponse) {
    const { isBuyOrder, order, error, opErrors, noOpErrors, txHash, txError, receivedTokenList, sentTokenList } = message;

    if (!order) return;

    let txDetails: string | undefined = undefined;
    let resultText = `
🎯 *Limit Order Executed*
${isBuyOrder ? "\n*🛒 Buy Dip*" : `\n${(order as SellLimitOrder).isTakeProfit ? "🆙 *Take Profit*" : "⏸️ *Stop Loss*"}`}
🪙 Token: ${order.token}
💵 ${order.triggeredByPrice ? `Trigger Price: *${order.triggerValue} USD*` : `Trigger Market Cap: *${order.triggerValue} USD*`}
✨ Slippage: *${order.slippage * 100}%*

`;
    if (txHash && receivedTokenList && sentTokenList) {
        const smartAccounts = noOpErrors as string[];

        const accountNames = await getNames(order.smartAccountsOwner, smartAccounts);

        const tokenConfig = await getTokenConfig(order.token);

        if (isBuyOrder)
            accountNames.forEach((accountName) => {

                const receive = formatUnits(receivedTokenList[accountName.smartAccount], tokenConfig.decimals);
                if (parseFloat(receive) != 0)
                    resultText += `🟢 #${accountName.name ?? accountName.smartAccount}: *Successful Transaction*
*-${roundValue(formatEther(sentTokenList[accountName.smartAccount]))} ETH* 
*+${roundValue(receive)} ${tokenConfig.symbol}*\n\n`;
                else
                    resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Transaction failed:*
This error may occur due to slippage\n\n`;
            });
        else
            accountNames.forEach((accountName) => {
                const eth = formatEther(receivedTokenList[accountName.smartAccount]);
                const spend = formatUnits(sentTokenList[accountName.smartAccount], tokenConfig.decimals);
                if (parseFloat(spend) != 0)
                    resultText += `🟢 #Wallet ${accountName.name ?? accountName.smartAccount}: *Successful Transaction*
*${eth.startsWith("-") ? "" : "+"}${roundValue(eth)} ETH* 
*-${roundValue(spend)} ${tokenConfig.symbol}*\n\n`;
                else
                    resultText += `🔴 #Wallet ${accountName.name ?? accountName.smartAccount}: *Transaction failed:* 
This error may occur due to slippage\n\n`;
            });

        txDetails = `https://arbiscan.io/tx/${txHash}`;
    }
    if (error) {
        resultText += `🔴 *${checkText(error)}*\n`;
    }
    if (txError) {
        resultText += `🔴 *Transaction failed:*\n`;

        const smartAccounts = noOpErrors as string[];
        const accountNames = await getNames(order.smartAccountsOwner, smartAccounts);

        accountNames.forEach((accountName) => {
            resultText += `#Wallet ${accountName.name ?? accountName.smartAccount} `;
        });
        resultText += `\nReason: ${(txError as string).length > 300 ? (checkText(txError as string)).slice(0, 300) + "..." : txError}\n`;
        resultText += `\nThis error can occur when either your abstract wallet or relayer wallet doesn't have enough ETH to pay the gas fee`;
    }
    if (opErrors && Object.keys(opErrors).length > 0) {
        resultText += `\n🔴 *Failed to build userOp with reasons:*\n\n`;

        const smartAccounts = Object.keys(opErrors);
        const accountNames = await getNames(order.smartAccountsOwner, smartAccounts);

        accountNames.forEach((accountName) => {
            const errorText = checkText(opErrors[accountName.smartAccount] as string);
            resultText += `🔴 #${accountName.name ?? accountName.smartAccount}\n${errorText.length > 300 ? errorText.slice(0, 300) + "..." : errorText}\n`;
        });
    }

    const telegramUserInfo = await getTelegramUserInfo(order.telegramId);

    if (telegramUserInfo) {
        try {
            bot.telegram.sendMessage(telegramUserInfo.chatId, resultText, {
                ...Markup.inlineKeyboard(txDetails ? [[Markup.button.url("Tx details", txDetails)], [closeButton]] : [[closeButton]]),
                parse_mode: "Markdown", link_preview_options: { is_disabled: true }
            });
        } catch (err) { }
    }
}
