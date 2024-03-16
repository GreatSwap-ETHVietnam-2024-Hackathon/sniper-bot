import { Context, Telegraf, session } from "telegraf";
import { backToMainMenu, deleteMessageOnCloseAction, safeDeleteMessage } from "./helper";
import { buildMainMenuFunctions, mainPanel } from "./controllers/main-menu";
import { TradingSettings } from "../types/trading-settings";
import { Mongo } from "@telegraf/session/mongodb";
import buildTradingFunctions, { chooseToken, handleUserInputs as handleTradingUserInputs } from "./controllers/trade";
import { SafetySettings } from "../types/safety-settings";
import { Preset } from "../types/preset";
import {
    buildSafetySettingsFunctions,
    safetySettingsPanel,
    handleUserInputs as handleSafetyUserInputs,
} from "./controllers/safety-settings";
import { buildPresetFunctions, presetPanel, handleUserInputs as handlePresetUserInputs } from "./controllers/preset";
import { addNewTelegramUser } from "../services/telegram-user";
import { isAddress } from "ethers/lib/utils";
// import onTestLimit from "./test-limit";
import { buildVerifyFunctions, checkVerifyFromMessage, handleUserInputs as handleAccountUserInputs } from "./controllers/verify-user";
import { onChangingRelayerSettings, relayerSettingsPanel } from "./controllers/relayer-settings";
import { lengthReferralCode } from "../configs/constants";
import { saveReferralInfo } from "../services/referral";
import {
    onConnectingToAccountsOwner,
    walletsPanel,
    buildWalletFunctions,
    handleUserInputs as handleWalletsUserInputs,
} from "./controllers/wallet";

export const TRADING_MSG_KEY_PREFIX = "Trading Settings:";
export const SAFETY_MSG_KEY_PREFIX = "Safety Settings:";
export const PRESET_MSG_KEY_PREFIX = "Preset Settings:";
export const WALLETS_MSG_KEY_PREFIX = "Wallets Settings:";
export const ACCOUNT_MSG_KEY_PREFIX = "Account Settings:";

export const commandList = [
    { name: "start", description: "Opens start panel" },
    { name: "panel", description: "Opens start panel" },
    { name: "trade", description: "Opens trading panel" },
    { name: "wallets", description: "Opens wallets settings" },
    { name: "safety", description: "Opens safety settings" },
    { name: "preset", description: "Set default ETH / % values for orders" },
];

interface SessionData {
    lastMessageId?: number;
    tradingSettings?: {
        [key: string]: TradingSettings;
    };
    messages?: {
        [key: number]: string;
    };
    safetySettings?: SafetySettings;
    preset?: Preset;
    isPrivRelayerInUse?: boolean;
    TxLastest?: number;
}
export interface BotContext extends Context {
    session: SessionData;
}
const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN!, {
    handlerTimeout: 9_000_000,
});

export const store = Mongo<SessionData>({
    url: process.env.MONGO_FULL_URL!,
    database: process.env.TELEGRAM_DB_NAME!,
    config: {
        retryWrites: true,
        w: "majority",
    },
});
// @ts-ignore
bot.use(session({ store }));

bot.command("start", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }

    const { id: telegramId, first_name: username } = ctx.message.from;
    const chatId = ctx.message.chat.id;
    addNewTelegramUser({ telegramId, username, chatId });
    const args = ctx.args;

    if (args.length > 0 && args[0].length == lengthReferralCode) {
        await saveReferralInfo(telegramId, args[0]);
        await mainPanel(ctx, true);
        return;
    }
    if (args.length > 0 && isAddress(args[0])) {
        await onConnectingToAccountsOwner(ctx, args[0].toLowerCase());
    } else await mainPanel(ctx, true);
});
bot.command("wallets", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    walletsPanel(ctx, true);
});
bot.command("panel", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    mainPanel(ctx, true);
});
bot.command("safety", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    safetySettingsPanel(ctx, true);
});
bot.command("preset", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    presetPanel(ctx, true);
});
bot.command("trade", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    chooseToken(ctx, true);
});
bot.command("relayer", async (ctx) => {
    if ((await checkVerifyFromMessage(ctx)) == true) {
        return;
    }
    relayerSettingsPanel(ctx, true);
});

deleteMessageOnCloseAction(bot);
backToMainMenu(bot);
buildTradingFunctions(bot);
buildMainMenuFunctions(bot);
buildSafetySettingsFunctions(bot);
buildPresetFunctions(bot);
buildWalletFunctions(bot);
// onTestLimit(bot);
// buildVerifyFunctions(bot);
onChangingRelayerSettings(bot);

bot.on("text", (ctx) => {
    const text = ctx.message.text;
    const repliedMsgId = ctx.message.reply_to_message?.message_id;
    if (repliedMsgId && ctx.session?.messages) {
        const msgKey = ctx.session.messages[repliedMsgId];
        if (msgKey)
            if (msgKey.startsWith(TRADING_MSG_KEY_PREFIX)) {
                handleTradingUserInputs(ctx, repliedMsgId, msgKey.slice(TRADING_MSG_KEY_PREFIX.length), text);
            } else if (msgKey.startsWith(SAFETY_MSG_KEY_PREFIX)) {
                handleSafetyUserInputs(ctx, repliedMsgId, msgKey.slice(SAFETY_MSG_KEY_PREFIX.length), text);
            } else if (msgKey.startsWith(PRESET_MSG_KEY_PREFIX)) {
                handlePresetUserInputs(ctx, repliedMsgId, msgKey.slice(PRESET_MSG_KEY_PREFIX.length), text);
            } else if (msgKey.startsWith(WALLETS_MSG_KEY_PREFIX)) {
                handleWalletsUserInputs(ctx, repliedMsgId, msgKey.slice(WALLETS_MSG_KEY_PREFIX.length), text);
            } else if (msgKey.startsWith(ACCOUNT_MSG_KEY_PREFIX)) {
                handleAccountUserInputs(ctx, repliedMsgId, msgKey.slice(ACCOUNT_MSG_KEY_PREFIX.length), text);
            }
    }
    safeDeleteMessage(ctx, ctx.message.message_id);
});

export default bot;
