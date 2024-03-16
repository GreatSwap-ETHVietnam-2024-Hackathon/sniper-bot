import { Markup, Telegraf } from "telegraf";
import { BotContext, WALLETS_MSG_KEY_PREFIX } from "../..";
import {
    backToMainMenuButton,
    closeButton,
    edit,
    getTelegramIdFromContext,
    handleNewMessageKey,
    inputEnquiry,
    reply,
    safeDeleteMessage,
} from "../../helper";
import { handleUnconnectedUser } from "../unconnected";
import { connectToAccountsOwner, getSmartAccounts, getSmartAccountsOwner } from "../../../services/approval";
import { refreshParticipatingWallets } from "../../session/trading-settings";
import { isAddress } from "ethers/lib/utils";
import { checkText } from "../../../services/utils";

import { getNames, setWalletName } from "../../../services/account-name";
import { getTokenFees } from "../../../services/token-paymaster-user";
import { onChangingTokenPaymasterSetting } from "./tokenPaymaster";

export async function onConnectingToAccountsOwner(ctx: BotContext, smartAccountsOwner: string) {
    const telegramId = getTelegramIdFromContext(ctx)!;

    try {
        const smartAccounts = await connectToAccountsOwner(telegramId, smartAccountsOwner);
        refreshParticipatingWallets(ctx);
        //const { msg, inlineKeyboard } = await walletsContent(smartAccountsOwner, smartAccounts);
        const { msg, inlineKeyboard } = await moveToTelegramContent(smartAccountsOwner, smartAccounts);
        reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx);
    } catch (err) {
        const msg = `🔴 *Account ${smartAccountsOwner} is not yet connected*`;
        const inlineKeyboard = Markup.inlineKeyboard([[closeButton]]);
        reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx);
    }
}
async function walletsContent(smartAccountsOwner: string, smartAccounts: string[]) {
    const accountNames = await getNames(smartAccountsOwner, smartAccounts);

    let msg = `*⚜️ Abstract wallets owner:* 
    \`${smartAccountsOwner}\`

*⚜️ ${smartAccounts.length} / 5 Abstract Wallets*
${accountNames.map(
    (accountName, index) => `\n💳 Wallet ${index + 1} : *${accountName?.name ?? "Unnamed"}*
Address:\`${accountName.smartAccount} \`
Pay gas fee with: ETH
`
)}
`;

    const inlineKeyboard = Markup.inlineKeyboard([
        ...accountNames.map((_account, index) => {
            return [Markup.button.callback(`⚙️ Wallet ${index + 1} settings`, `Setting Detail Wallet:${index + 1}`)];
        }),
        [Markup.button.callback("🔀 Change wallets", "Change wallets ")],
        [backToMainMenuButton, closeButton],
    ]);
    msg = msg.replace(/,/g, "");
    return { msg, inlineKeyboard };
}

async function moveToTelegramContent(smartAccountsOwner: string, smartAccounts: string[]) {
    const accountNames = await getNames(smartAccountsOwner, smartAccounts);
    const msg = `*⚜️ Greatswap Trading Bot:* 

You are connected to Web3 wallet: ${smartAccountsOwner} 

*${smartAccounts.length} / 5 Abstract Wallets*
${accountNames.map((accountName) => `\n💳 *${accountName?.name ?? "Unnamed"} -*\n${accountName.smartAccount}\n`)}
`;
    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("💸 Trade", "Trade menu")],
        [Markup.button.callback("💳 Wallet settings", "Wallet settings menu")],
        [Markup.button.callback("🔒 Safety settings", "Safety settings menu")],
        [Markup.button.callback("🏍️ Relayer settings", "Relayer settings menu")],
        [Markup.button.callback("🎛️ Preset", "Preset menu")],
        [Markup.button.callback("🆔 Get your Telegram ID", "Get Telegram ID")],
        [closeButton],
    ]);
    return { msg, inlineKeyboard };
}

export async function walletsPanel(ctx: BotContext, isCommand?: boolean) {
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    const smartAccounts = await getSmartAccounts(ctx);
    if (!smartAccountsOwner || !smartAccounts.length) return handleUnconnectedUser(ctx);

    const { msg, inlineKeyboard } = await walletsContent(smartAccountsOwner, smartAccounts);
    if (isCommand) {
        await reply(ctx, msg, inlineKeyboard);
        safeDeleteMessage(ctx);
    } else {
        await edit(ctx, msg, inlineKeyboard);
    }
}

async function SettingDetailWalletPanel(ctx: BotContext) {
    //@ts-ignore
    const walletId = ctx.callbackQuery.data.split(":")[1];
    const smartAccountsOwner = await getSmartAccountsOwner(ctx);
    const smartAccounts = await getSmartAccounts(ctx);
    const accountNames = await getNames(smartAccountsOwner!, smartAccounts);
    const tokenPaymasters = await getTokenFees(smartAccountsOwner!, smartAccounts);
    const msg = `⚙️ Setting Wallet ${walletId}
Wallet name: *${accountNames[walletId - 1].name ?? "Unname"}* 
Wallet address: \`${smartAccounts[walletId - 1]}\`
Gas token: * ${tokenPaymasters[walletId - 1].feeToken.symbol} *
        `;
    const inlineKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback("💸 Rename wallet", `Wallets_Rename:${smartAccounts[walletId - 1]}`)],
        [Markup.button.callback("💸 Choose gas token", `Setting Token Fee:${walletId}:${smartAccounts[walletId - 1]}`)],
        [Markup.button.callback("Back", "Back to wallet content"), closeButton],
    ]);
    edit(ctx, msg, inlineKeyboard);
}

function onChoosingChange(bot: Telegraf<BotContext>) {
    bot.action("Change wallets", (ctx) => {
        const telegramId = getTelegramIdFromContext(ctx)!;
        const msg = `⚙️ Change Abstract Wallets

💡 Go to *Greatswap Station* to change your abstract wallets and configure Bot Permissions.
`;
        const inlineKeyboard = Markup.inlineKeyboard([
            [Markup.button.url(`Go to Greatswap Station`, `${process.env.STATION_URL}bot-settings/${telegramId}`)],
            // [Markup.button.callback(`Enter Web3 address`, "Enter Web3 address")],
            [Markup.button.callback("< Back", "Back to wallets"), closeButton],
        ]);

        edit(ctx, msg, inlineKeyboard);
    });
}

function onBackToWallets(bot: Telegraf<BotContext>) {
    bot.action("Back to wallets", (ctx) => walletsPanel(ctx));
}

function onEnteringWeb3Address(bot: Telegraf<BotContext>) {
    bot.action("Enter Web3 address", async (ctx) => {
        const msg = `⚙️ Enter the Web3 address you want to connect the bot to

💡 Enter your address in format "0xabc12...."
                
`;
        const msgId = await inputEnquiry(ctx, msg);
        handleNewMessageKey(ctx, msgId, `${WALLETS_MSG_KEY_PREFIX}EnterWeb3Address`);
    });
}

function onChangingWalletName(bot: Telegraf<BotContext>) {
    bot.action(/Wallets_Rename:.+/, async (ctx) => {
        //@ts-ignore
        const address = ctx.callbackQuery.data.split(":")[1];

        const smartAccountsOwner = await getSmartAccountsOwner(ctx);
        const smartAccounts = await getSmartAccounts(ctx);
        console.log(" address", address);
        if (!smartAccountsOwner || !smartAccounts.length) return handleUnconnectedUser(ctx);

        const accountName = (await getNames(smartAccountsOwner, smartAccounts)).find((a) => a.smartAccount === address);
        const name = accountName?.name ?? "Unnamed";
        const nameConvert = checkText(name);
        const msg = `⚙️ Reset Your Wallet Name
        
📈 Current Name: ${nameConvert}
💡 Enter New Name
                
`;
        safeDeleteMessage(ctx);
        const msgId = await inputEnquiry(ctx, msg);
        handleNewMessageKey(ctx, msgId, `${WALLETS_MSG_KEY_PREFIX}Rename:${address}`);
    });
}

export async function onChangingWalletSetting(bot: Telegraf<BotContext>) {
    bot.action(/Setting Detail Wallet./, async (ctx) => {
        await SettingDetailWalletPanel(ctx);
    });

    bot.action(/Back to wallet content/, async (ctx) => {
        await walletsPanel(ctx);
    });
}

export function buildWalletFunctions(bot: Telegraf<BotContext>) {
    onChangingWalletName(bot);
    onChoosingChange(bot);
    onBackToWallets(bot);
    onEnteringWeb3Address(bot);
    onChangingWalletSetting(bot);
    onChangingTokenPaymasterSetting(bot);
}

export async function handleUserInputs(ctx: BotContext, msgId: number, msgKey: string, userInput: string) {
    let deleteMSG = true;
    const [functionName, address] = msgKey.split(":");
    switch (functionName) {
        case "Rename":
            const smartAccountsOwner = await getSmartAccountsOwner(ctx);
            const smartAccounts = await getSmartAccounts(ctx);
            if (!smartAccountsOwner || !smartAccounts.length) return handleUnconnectedUser(ctx);
            if (isValidString(userInput)) {
                await setWalletName(smartAccountsOwner, address, userInput);
                const { msg, inlineKeyboard } = await walletsContent(smartAccountsOwner, smartAccounts);
                reply(ctx, msg, inlineKeyboard);
            } else {
                const msg = "The name can only include alphabet, decimal and spacing characters";
                const inlineKeyboard = Markup.inlineKeyboard([closeButton]);
                reply(ctx, msg, inlineKeyboard);
            }
            break;
        case "EnterWeb3Address":
            if (isAddress(userInput)) {
                await onConnectingToAccountsOwner(ctx, userInput.toLowerCase());
            } else {
                const errText = `*⚠︎ Invalid input*`;
                const inlineKeyboard = Markup.inlineKeyboard([closeButton]);
                reply(ctx, errText, inlineKeyboard);
            }
            break;
        default:
            deleteMSG = false;
            break;
    }
    if (deleteMSG) {
        safeDeleteMessage(ctx, msgId);
    }
}

function isValidString(inputString: string) {
    var pattern = /^[a-zA-Z0-9\s]+$/;
    return pattern.test(inputString);
}
