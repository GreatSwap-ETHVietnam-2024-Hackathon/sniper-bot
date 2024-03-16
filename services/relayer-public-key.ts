import { BigNumber, Wallet } from "ethers";
import { hexZeroPad, keccak256 } from "ethers/lib/utils";
import HDKey from "hdkey";

const seed = process.env.PRIVATE_RELAYER_KEY_SEED!
const hdKey = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'));

export async function getRelayerPublicKey(telegramId: number): Promise<string> {
    const hash = (BigInt(keccak256(
        hexZeroPad(BigNumber.from(telegramId).toHexString(), 32)
    )).toString(2)).padStart(256, '0')

    let derivationPath = 'm'
    for (let i = 0; i < 8; i++) {
        const index = BigInt('0b' + hash.slice(31 * i, 31 * i + 31)).toString(10)
        derivationPath += `/${index}'`
    }
    const lastIndex = BigInt('0b' + hash.slice(248)).toString(10)
    derivationPath += `/${lastIndex}'`

    const childKey = hdKey.derive(derivationPath)

    return new Wallet(childKey.privateKey).address
}