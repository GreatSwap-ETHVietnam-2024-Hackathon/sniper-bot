import { Markup, Telegraf } from "telegraf";
import { BotContext } from ".";
import { getTradingSettingsFromBotSession, setTradingSettings } from "./session/trading-settings";
import { chunk, hexToBase64 } from "./utils";
import { closeButton, edit, errReply, getTelegramIdFromContext, reply } from "./helper";
import { getSafetySettingsFromBotSession } from "./session/safety-settings";
import { getPresetFromBotSession } from "./session/preset";
import { getAllNamesFromCtx } from "../services/account-name";
import { getTextForTradingPanel } from "../services/trading-data";
import { backToTokensButton, participatingWallets, readBalancesButton, refreshDataButton } from "./controllers/trade";
import { measures } from "./controllers/trade/limit-buy";
import { getTokenConfig } from "../services/token-config";
import { getSmartAccounts } from "../services/approval";
import { fetchBalances } from "../services/balance";

export async function buyLimitPanel(ctx: BotContext, tokenBase64: string, eth: number) {
    const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
    const safety = getSafetySettingsFromBotSession(ctx);
    const preset = getPresetFromBotSession(ctx);
    const accountNames = await getAllNamesFromCtx(ctx);
    const actualWallets = settings.participatingWallets.filter(wallet => accountNames.find(a => a.smartAccount === wallet) !== undefined)

    const msg = `⚙️ Buy Limit Order 
${await getTextForTradingPanel(tokenBase64, true)}
    `
    const inlineKeyboard = Markup.inlineKeyboard([
        ...participatingWallets(tokenBase64, actualWallets, accountNames),
        [refreshDataButton(tokenBase64), readBalancesButton(tokenBase64)],
        [
            Markup.button.callback(`💰 ETH Spend: ${eth} ETH`, `ETH Spend:${tokenBase64}`)
        ],
        [
            Markup.button.callback(`⏳ Active: ${settings.buyLimitSettings.active}H`, `BL Active Duration:${tokenBase64}`),
            Markup.button.callback(`⚡ Slippage: ${settings.slippage ?? safety.slippage}%`, `Set slippage:${tokenBase64}`)
        ],
        measures(tokenBase64, settings.buyLimitSettings.measure),
        ...chunk([...preset.buyLimit, '-X'], 2).map((chunk) => chunk.map(
            (value) => {
                return Markup.button.callback(`📉 ${value}%`, value === '-X' ? `CustomizeBLPercent:${tokenBase64}` : `BL:${value}:${tokenBase64}`)
            }
        )),
        [Markup.button.callback("⚙️ Buy Limit Order Overview", `Buy Limit Order Overview:${tokenBase64}`)],
        [Markup.button.callback("📈 Sell Limit", `Sell Limit:${tokenBase64}`), Markup.button.callback("🛒 Buy", `Buy:${tokenBase64}`), Markup.button.callback("🛍️ Sell", `Sell:${tokenBase64}`)],
        [backToTokensButton, closeButton],
    ])
    return { msg, inlineKeyboard }
}

export default function onTestLimit(bot: Telegraf<BotContext>) {
    bot.command("test_limit", async (ctx) => {
        const start = Date.now();
        let success = 0;

        const token = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
        const tokenBase64 = hexToBase64(token);

        async function updateMessage(i: number) {
            const settings = getTradingSettingsFromBotSession(ctx, tokenBase64);
            const oldETHSpend = settings.buyLimitSettings.ethSpend;
            settings.buyLimitSettings.ethSpend = i
            const text = `🟢 *ETH Spend Set*
    
Previous value: ${oldETHSpend} ETH
New value: ${i} ETH
    `
            setTradingSettings(ctx, tokenBase64, settings)
            const { msg, inlineKeyboard } = await buyLimitPanel(ctx, tokenBase64, i)

            // const res1 = await reply(ctx, text, Markup.inlineKeyboard([closeButton]))
            // const res2 = await edit(ctx, msg, inlineKeyboard, settings.messageId);
            // const res3 = await errReply(ctx);

            // if (res1 > 0 && res2 > 0 && res3 > 0) success++;

            const tokens = [
                '0x912CE59144191C1204E64559FE8253a0e49E6548',
                '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
                '0x00cbcf7b3d37844e44b888bc747bdd75fcf4e555',
                '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a',
                '0x9842989969687f7d249d01cae1d2ff6b7b6b6d35',
                '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
                '0x4e352cf164e64adcbad318c3a1e222e9eba4ce42',
                '0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8',
                '0x539bde0d7dbd336b79148aa742883198bbf60342',
                '0x6daf586b7370b14163171544fca24abcc0862ac5',
            ]
            async function testFetchToken(token: string) {
                const config = await getTokenConfig(token);

                const smartAccounts = await getSmartAccounts(ctx);

                try {
                    console.log(token);
                    const balances = await fetchBalances(getTelegramIdFromContext(ctx)!, token, smartAccounts, config);
                    console.log(balances);
                } catch (err) {

                }
            }
            await Promise.all(tokens.map(t => testFetchToken(t.toLowerCase())))
        }
        const calls = [...Array(100).keys()]

        await Promise.all(calls.map(eth => updateMessage(eth)))
        console.log("Done: ", success);
        const end = Date.now();
        console.log("Execution time: ", end - start);
    })
}