import { BigNumber } from "bignumber.js";
import { base64ToHex, displayName } from "../bot/utils";
import { getMarketInfo } from "./trading-data";
import { getAllNamesOfOwner, getNames } from "./account-name";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { poolToRouter } from "../configs/constants";
import { getApproval } from "./approval";
import { timestampToHours } from "./utils";
import SellLimitOrderModel from "../models/sell-limit-order";
import { getTokenConfig } from "./token-config";

export function takePercentage(a: string, percentage: number) {
    return Math.round(+a * percentage * 1e8) / 1e10;
}

export async function displaySellLimitOrders(telegramId: number, smartAccountsOwner: string, tokenBase64: string) {
    const token = base64ToHex(tokenBase64);
    const config = await getTokenConfig(token);
    const now = Date.now();
    const limitOrders = await SellLimitOrderModel.find({ telegramId, smartAccountsOwner, token, expiryDate: { $gte: now } });
    let limitOrdersText = "";
    if (limitOrders.length === 0) limitOrdersText = "\n*You have no sell limit orders*";
    else {
        const accountNames = await getAllNamesOfOwner(smartAccountsOwner);
        for (let i = 0; i < limitOrders.length; i++) {
            const order = limitOrders[i];
            const timeLeft = timestampToHours(order.expiryDate - now);
            const slippage = order.slippage * 100;
            const walletNames = order.participatingWallets.map((address) => {
                const accountName = accountNames.find((c) => c.smartAccount === address);
                return displayName(accountName ? `W#${accountName.name ?? accountName.smartAccount}` : `W#${address}`, 10, 5);
            });
            limitOrdersText += `
*#${i + 1}*
${order.isTakeProfit ? "🆙 *Take Profit*" : "⏸️ *Stop Loss*"}
${order.tokenSpend ? `💰 Sell: *${formatUnits(order.tokenSpend, config.decimals)} ${config.symbol}*` : `💰 Sell: *${order.sellPercent}%*`}
💵 ${order.triggeredByPrice ? `Trigger Price: *${order.triggerValue} USD*` : `Trigger Market Cap: *${order.triggerValue} USD*`}
✨ Slippage: *${slippage}%*
💳 Participating Wallets:  *${walletNames.join(", ")}*
⌛ Time Left: *${timeLeft}*
        `;
        }
    }
    const marketInfo = await getMarketInfo(token);
    return {
        text: `${limitOrdersText}

📊 Current Price: *${new BigNumber(marketInfo.priceUSDC as string).toFixed(6)} USD*
🧢 Market Cap: *${new BigNumber(marketInfo.marketCap as string).toFixed(6)} USD*

`,
        ids: limitOrders.map((order) => order._id),
    };
}

export async function addSellLimitOrder(
    telegramId: number,
    smartAccountsOwner: string,
    tokenBase64: string,
    activeDuration: number,
    slippage: number,
    participatingWallets: string[],
    triggeredByPrice: boolean,
    customValue?: number,
    changingPercent?: number,
    sellPercent?: number,
    tokenAmount?: number
) {
    try {
        const approval = await getApproval(telegramId);
        if (approval.locked) {
            return `🔴 Account is locked`;
        }
        participatingWallets = participatingWallets.filter((wallet) => approval.smartAccounts.includes(wallet));

        if (participatingWallets.length === 0) {
            return "🔴 No account chosen";
        }
    } catch (err) {
        return `🔴 No approval data found`;
    }
    const token = base64ToHex(tokenBase64);
    const count = await SellLimitOrderModel.countDocuments({ telegramId, smartAccountsOwner, token, expiryDate: { $gte: Date.now() } });
    const countOrder = await SellLimitOrderModel.countDocuments({ telegramId, expiryDate: { $gte: Date.now() } });
    if (count >= 5 || countOrder >= 20) {
        return `🔴 You can only create up to 5 sell limit orders per token and up to 20 limit orders in total`;
    }

    const marketInfo = await getMarketInfo(token);

    const currentValue = triggeredByPrice ? marketInfo.priceUSDC : marketInfo.marketCap;
    let triggerValue: number;

    triggerValue = customValue ?? takePercentage(currentValue, 100 + changingPercent!);

    const isTakeProfit = new BigNumber(triggerValue).gte(currentValue);

    const config = await getTokenConfig(token);
    let tokenSpend = tokenAmount ? parseUnits(`${tokenAmount}`, config.decimals).toString() : undefined;

    const limitOrder = new SellLimitOrderModel({
        telegramId,
        smartAccountsOwner,
        token,
        router: poolToRouter(marketInfo.mostLiquidPool),
        participatingWallets,
        tokenSpend,
        sellPercent,
        expiryDate: Date.now() + activeDuration * 3.6e6,
        slippage: slippage / 100,
        triggeredByPrice,
        triggerValue,
        isTakeProfit,
    });

    await limitOrder.save();

    const walletNames = (await getNames(smartAccountsOwner, participatingWallets)).map((accountName) => {
        return displayName(`W#${accountName.name ?? accountName.smartAccount}`, 10, 5);
    });
    return `🟢 *Sell Limit Order Created + Activated*
    
${isTakeProfit ? "🆙 *Take Profit*" : "⏸️ *Stop Loss*"}
🌍 Token Address
${token}
        
${tokenSpend ? `💰 Sell: *${formatUnits(tokenSpend, config.decimals)} ${config.symbol}*` : `💰 Sell: *${sellPercent}%*`}
💵 Trigger ${triggeredByPrice ? "Price" : "Market Cap"}: *${triggerValue} USD*
⌛ Active For: *${activeDuration}h*
✨ Slippage: *${slippage}%*
💳 Participating Wallets:  ${walletNames.join(", ")}

`;
}

export async function cancelSellLimitOrder(_id: string) {
    const order = await SellLimitOrderModel.findById(_id);
    if (!order) {
        return `🔴 *Order has already been deleted*`;
    }
    const config = await getTokenConfig(order.token);
    const text = `🟢 *Buy Limit Order Canceled Successfully*

💵 Trigger ${order.triggeredByPrice ? "Price" : "Market Cap"}: *${order.triggerValue} USD*
${order.tokenSpend ? `💰 Sell: *${formatUnits(order.tokenSpend, config.decimals)} ${config.symbol}*` : `💰 Sell: *${order.sellPercent}%*`}
`;
    await SellLimitOrderModel.deleteOne({ _id });
    return text;
}
