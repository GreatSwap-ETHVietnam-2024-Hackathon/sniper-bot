import { BotContext } from "..";
import { SafetySettings, defaultSafetySettings } from "../../types/safety-settings";

export function getSafetySettingsFromBotSession(ctx: BotContext) {
    let settings: SafetySettings | undefined;
    if (ctx.session?.safetySettings) settings = ctx.session.safetySettings
    else {
        settings = defaultSafetySettings;
        ctx.session = { ...ctx.session, safetySettings: settings }
    }
    return settings
}

export function setSafetySettings(ctx: BotContext, option: Partial<SafetySettings>) {
    if (ctx.session) {
        if (ctx.session.safetySettings) {
            Object.assign(ctx.session.safetySettings, option)
        } else {
            ctx.session.safetySettings = Object.assign(defaultSafetySettings, option)
        }
    }
    else {
        ctx.session = {
            safetySettings: Object.assign(defaultSafetySettings, option)
        }
    }
}