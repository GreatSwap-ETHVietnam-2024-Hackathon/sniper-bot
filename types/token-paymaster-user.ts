import { Token } from "./token-paymaster";

export type SmartAccount = {
    address: string;
    feeToken: Token;
    listTokenApproved: Token[];
};

export interface TokenPaymasterUser {
    smartAccountsOwner: string;
    smartAccounts: SmartAccount[];
}
