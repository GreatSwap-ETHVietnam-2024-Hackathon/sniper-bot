export interface UsageInviteCode {
    usedBy: number;
    usedAt: Date;
}

export interface InviteCode {
    code: number;
    status: String;
    usages: UsageInviteCode[];
    maxUsages: number;
    expirationDate: Date;
}
