export interface Approval {
    smartAccountsOwner: string,
    smartAccounts: string[],
    telegramId: number,
    salt: number,
    tokens: string[],
    locked: boolean,
    connected: boolean
}