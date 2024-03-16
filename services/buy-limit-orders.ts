import { BigNumberish } from "ethers";
import { base64ToHex, displayName } from "../bot/utils";
import { getMarketInfo } from "./trading-data";
import { getAllNamesOfOwner, getNames } from "./account-name";
import { formatEther, parseEther } from "ethers/lib/utils";
import { poolToRouter } from "../configs/constants";
import BigNumber from "bignumber.js";
import { getApproval } from "./approval";
import { timestampToHours } from "./utils";
import BuyLimitOrderModel from "../models/buy-limit-order";

export function takePercentage(a: string, percentage: number) {
    return Math.round(+a * percentage * 1e8) / 1e10;
}

export async function displayBuyLimitOrders(telegramId: number, smartAccountsOwner: string, tokenBase64: string) {
    const token = base64ToHex(tokenBase64);
    const now = Date.now();
    const limitOrders = await BuyLimitOrderModel.find({ telegramId, smartAccountsOwner, token, expiryDate: { $gte: now } });
    let limitOrdersText = "";
    if (limitOrders.length === 0) limitOrdersText = "\n*You have no buy limit orders*";
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
            const ethAmount = formatEther(order.ethSpend);
            limitOrdersText += `
*#${i + 1}*
💰 ETH Spend: *${ethAmount} ETH*
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

export async function addBuyLimitOrder(
    telegramId: number,
    smartAccountsOwner: string,
    tokenBase64: string,
    ethSpend: BigNumberish,
    activeDuration: number,
    slippage: number,
    participatingWallets: string[],
    triggeredByPrice: boolean,
    customValue?: number,
    changingPercent?: number
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

    if (participatingWallets.length === 0) return `🔴 *No account chosen*`;
    const token = base64ToHex(tokenBase64);
    const count = await BuyLimitOrderModel.countDocuments({ telegramId, smartAccountsOwner, token, expiryDate: { $gte: Date.now() } });
    const countOrder = await BuyLimitOrderModel.countDocuments({ telegramId, expiryDate: { $gte: Date.now() } });
    if (count >= 5 || countOrder >= 20) {
        return `🔴 You can only create up to 5 buy limit orders per token and up to 20 limit orders in total`;
    }

    const marketInfo = await getMarketInfo(token);

    const currentValue = triggeredByPrice ? marketInfo.priceUSDC : marketInfo.marketCap;
    let triggerValue: number;

    triggerValue = customValue ?? takePercentage(currentValue, 100 + changingPercent!);
    if (new BigNumber(triggerValue).gte(currentValue)) {
        return "🔴 *Trigger value is too high* ";
    }

    const limitOrder = new BuyLimitOrderModel({
        telegramId,
        smartAccountsOwner,
        token,
        router: poolToRouter(marketInfo.mostLiquidPool),
        participatingWallets,
        ethSpend: parseEther(`${ethSpend}`).toString(),
        expiryDate: Date.now() + activeDuration * 3.6e6,
        slippage: slippage / 100,
        triggeredByPrice,
        triggerValue,
    });

    await limitOrder.save();

    const walletNames = (await getNames(smartAccountsOwner, participatingWallets)).map((accountName) => {
        return displayName(`W#${accountName.name ?? accountName.smartAccount}`, 10, 5);
    });
    return `🟢 *Buy Limit Order Created + Activated*

🌍 Token Address
${token}
        
💰 ETH Spend: *${ethSpend} ETH*
💵 Trigger ${triggeredByPrice ? "Price" : "Market Cap"}: *${triggerValue} USD*
⌛ Active For: *${activeDuration}h*
✨ Slippage: *${slippage}%*
💳 Participating Wallets:  ${walletNames.join(", ")}

`;
}

export async function cancelBuyLimitOrder(_id: string) {
    const order = await BuyLimitOrderModel.findById(_id);
    if (!order) {
        return `🔴 *Order has already been deleted*`;
    }
    const ethAmount = formatEther(order.ethSpend);
    const text = `🟢 *Buy Limit Order Canceled Successfully*

💵 Trigger ${order.triggeredByPrice ? "Price" : "Market Cap"}: *${order.triggerValue} USD*
💰 ETH Spend: *${ethAmount} ETH*
`;
    await BuyLimitOrderModel.deleteOne({ _id });
    return text;
}
