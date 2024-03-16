import { BotContext } from "..";
import { TradingSettings, defaultTradingSettings } from "../../types/trading-settings";

export function getTradingSettingsFromBotSession(ctx: BotContext, token: string) {
    let settings: TradingSettings | undefined;
    const defaultValue: TradingSettings = defaultTradingSettings
    if (ctx.session?.tradingSettings) settings = ctx.session.tradingSettings[token]
    if (!settings) {
        settings = defaultValue;
    }
    return settings
}

export function setTradingSettings(ctx: BotContext, token: string, newSettings: TradingSettings) {
    if (ctx.session) {
        if (ctx.session.tradingSettings) {
            ctx.session.tradingSettings[token] = newSettings
        } else {
            ctx.session.tradingSettings = {
                [token]: newSettings
            }
        }
    }
    else {
        ctx.session = {
            tradingSettings: {
                [token]: newSettings
            }
        }
    }
}

export function refreshParticipatingWallets(ctx: BotContext) {
    if (!ctx.session?.tradingSettings) return;
    Object.values(ctx.session.tradingSettings).forEach(setting => {
        setting.participatingWallets = []
    })
}