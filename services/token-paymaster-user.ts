import { TokenPaymasterUserModel } from "../models/token-paymaster-user";
import { Token } from "../types/token-paymaster";
import { ethToken, getTokenByAddress, getTokenByName } from "./token-paymaster";

export async function getTokenFees(smartAccountsOwner: string, smartAccountAddress: string[]) {
    const smartAccounts = await TokenPaymasterUserModel.findOne({ smartAccountsOwner });
    if (!smartAccounts)
        return smartAccountAddress.map((smartAccount) => ({
            smartAccount,
            feeToken: { symbol: "ETH", address: "0x" } as Token,
            listTokenApprove: [{ symbol: "ETH", address: "0x" } as Token],
        }));

    return smartAccountAddress.map((smartAccount) => {
        const foundAccount = smartAccounts.smartAccounts.find((a) => a.address == smartAccount);
        if (foundAccount) {
            return {
                smartAccount,
                feeToken: foundAccount.feeToken,
                listTokenApprove: foundAccount.listTokenApproved,
            };
        } else {
            return {
                smartAccount,
                feeToken: { symbol: "ETH", address: "0x" } as Token,
                listTokenApprove: [{ symbol: "ETH", address: "0x" } as Token],
            };
        }
    });
}

export async function setTokenFee(smartAccountsOwner: string, smartAccount: string, tokenName: string) {
    const token = await getTokenByName(tokenName);
    console.log(" token save ", smartAccount, " x ", token);
    let smartAccountListModel = await TokenPaymasterUserModel.findOne({ smartAccountsOwner });
    if (!smartAccountListModel) {
        smartAccountListModel = new TokenPaymasterUserModel({
            smartAccountsOwner,
            smartAccounts: [
                {
                    address: smartAccount,
                    feeToken: token,
                    listTokenApproved: [ethToken],
                },
            ],
        });
        await smartAccountListModel.save();
        return;
    }
    const index = smartAccountListModel.smartAccounts.findIndex((item) => item.address === smartAccount);
    if (index === -1) {
        smartAccountListModel.smartAccounts.push({
            address: smartAccount,
            feeToken: token!,
            listTokenApproved: [ethToken, token!],
        });
    } else {
        smartAccountListModel.smartAccounts[index].feeToken = token!;
    }
    await TokenPaymasterUserModel.updateOne(
        {
            smartAccountsOwner,
        },
        {
            $set: {
                smartAccounts: smartAccountListModel.smartAccounts,
            },
        },
        {
            upsert: true,
        }
    );
}

export async function addTokenToListTokenApprove(smartAccountsOwner: string, smartAccount: string, tokenAddress: string) {
    const token = await getTokenByAddress(tokenAddress);
    console.log("token = ", token);
    if (token == undefined) {
        return;
    }
    let smartAccountListModel = await TokenPaymasterUserModel.findOne({ smartAccountsOwner });
    console.log("XXX = ", smartAccountListModel);
    if (!smartAccountListModel) {
        smartAccountListModel = new TokenPaymasterUserModel({
            smartAccountsOwner,
            smartAccounts: [
                {
                    address: smartAccount,
                    feeToken: token,
                    listTokenApproved: [ethToken, token],
                },
            ],
        });
        await smartAccountListModel.save();
        return;
    } else {
        const index = smartAccountListModel.smartAccounts.findIndex((item) => item.address === smartAccount);
        console.log("index = ", index);
        if (index === -1) {
            smartAccountListModel.smartAccounts.push({
                address: smartAccount,
                feeToken: token!,
                listTokenApproved: [ethToken, token],
            });
        } else {
            smartAccountListModel.smartAccounts[index].feeToken = token!;
            smartAccountListModel.smartAccounts[index].listTokenApproved.push(token);
        }
        await TokenPaymasterUserModel.updateOne(
            {
                smartAccountsOwner,
            },
            {
                $set: {
                    smartAccounts: smartAccountListModel.smartAccounts,
                },
            },
            {
                upsert: true,
            }
        );
    }
}
