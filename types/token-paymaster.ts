export type Token = {
    symbol: string;
    address: string;
};

export interface TokenPaymaster {
    token: Token;
    active: boolean;
}
