export interface AccountName {
    smartAccount: string;
    name?: string;
}

export interface AccountNameList {
    smartAccountsOwner: string;
    nameList: AccountName[]
}