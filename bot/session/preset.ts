import { BotContext } from "..";
import { Preset, defaultPreset } from "../../types/preset";

export function getPresetFromBotSession(ctx: BotContext) {
    let preset: Preset | undefined;
    if (ctx.session?.preset) preset = ctx.session.preset
    else {
        preset = defaultPreset;
        ctx.session = { ...ctx.session, preset }
    }
    return preset
}

export function setPresetSettings(ctx: BotContext, option: Partial<Preset>) {
    if (ctx.session) {
        if (ctx.session.preset) {
            Object.assign(ctx.session.preset, option)
        } else {
            ctx.session.preset = Object.assign(defaultPreset, option)
        }
    }
    else {
        ctx.session = {
            preset: Object.assign(defaultPreset, option)
        }
    }
}