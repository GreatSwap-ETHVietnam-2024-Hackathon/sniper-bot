import BigNumber from "bignumber.js";

export function timestampToHours(timestamp: number) {
    const hours = Math.floor(timestamp / 3.6e6);
    let remaining = timestamp - hours * 3.6e6;
    const minutes = Math.floor(remaining / 6e4);
    remaining -= minutes * 6e4;
    const seconds = Math.floor(remaining / 1e3);
    return `${hours}h${minutes}m${seconds}s`;
}

export function roundValue(value: string, precision: number = 6) {
    return new BigNumber(value).toFixed(precision);
}
export function sleep(ms: any) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


export function checkText(text: string) {
    let result = text.replace(/_/g, '\ ');
    result = result.replace(/\*/g, "\\*");
    result = result.replace(/~/g, '\~');
    result = result.replace(/\|/g, ' ');
    return result;

}