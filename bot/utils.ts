export function chunk<T>(arr: T[], chunkSize: number) {
    const R = [];
    for (var i = 0; i < arr.length; i += chunkSize) R.push(arr.slice(i, i + chunkSize));
    return R;
}

export function hexToBase64(hexString: string) {
    const base64 = Buffer.from(hexString.slice(2), "hex").toString("base64");
    return base64;
}

export function base64ToHex(base64: string) {
    return ("0x" + Buffer.from(base64, "base64").toString("hex")).toLowerCase();
}

export function displayAddress(address: string, startingCharacterNum: number, endingCharacterNum: number) {
    return address.slice(0, startingCharacterNum) + "..." + address.slice(-endingCharacterNum);
}

export function displayName(name: string, startingCharacterNum: number, endingCharacterNum: number) {
    if (name.length <= startingCharacterNum + endingCharacterNum) return name;
    return name.slice(0, startingCharacterNum) + "..." + name.slice(-endingCharacterNum);
}

export function checkTimePassed(x: Date, ysecond: number): boolean {
    const currentTime = Date.now();

    const xsecond = x.getTime() / 1000;

    const currentSecond = currentTime / 1000;

    return currentSecond - xsecond >= ysecond;
}
