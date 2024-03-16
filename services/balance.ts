import { BigNumber } from "ethers";
import { MulticallAddress, WETHAddress, getBestRPC } from "../configs/constants";
import { ERC20__factory, Multicall__factory } from "../typechain-types";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { TokenConfig } from "../types/token-config";
import TokenBalanceModel from "../models/token-balance";
import RelayerBalanceModel from "../models/relayer-balance";

const ERC20Interface = ERC20__factory.createInterface();
const MulticallInterface = Multicall__factory.createInterface();

export async function fetchBalances(telegramId: number, token: string, smartAccounts: string[], config: TokenConfig) {
    try {
        let calls: {
            target: string;
            allowFailure: boolean;
            callData: string;
        }[] = [];

        const sortedSmartAccounts = smartAccounts.sort();
        const ethBalanceInfo = await TokenBalanceModel.findOne({ telegramId, token: "0x0", smartAccounts: sortedSmartAccounts });
        const wethBalanceInfo = await TokenBalanceModel.findOne({ telegramId, token: "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f", smartAccounts: sortedSmartAccounts });
        const tokenBalanceInfo = await TokenBalanceModel.findOne({ telegramId, token, smartAccounts: sortedSmartAccounts });

        const dateNow = Date.now();
        //@ts-ignore
        const ethAvailable = ethBalanceInfo !== null && ethBalanceInfo.updatedAt.getTime() + 10000 > dateNow;
        //@ts-ignore
        const tokenAvailable = tokenBalanceInfo !== null && tokenBalanceInfo.updatedAt.getTime() + 10000 > dateNow;
        //@ts-ignore
        const wethAvailable = wethBalanceInfo !== null && wethBalanceInfo.updatedAt.getTime() + 10000 > dateNow;

        if (ethAvailable && tokenAvailable && wethAvailable) {
            return smartAccounts.map((smartAccount) => {
                const index = sortedSmartAccounts.indexOf(smartAccount);
                return {
                    ethBalance: ethBalanceInfo.balances[index],
                    wethBalance: wethBalanceInfo.balances[index],
                    tokenBalance: tokenBalanceInfo.balances[index],
                };
            });
        }

        sortedSmartAccounts.forEach((smartAccount) => {
            if (!tokenAvailable) {
                const tokenBalanceCall = {
                    target: token,
                    allowFailure: false,
                    callData: ERC20Interface.encodeFunctionData("balanceOf", [smartAccount]),
                };
                calls.push(tokenBalanceCall);
            }

            if (!ethAvailable) {
                const ethBalanceCall = {
                    target: MulticallAddress,
                    allowFailure: false,
                    callData: MulticallInterface.encodeFunctionData("getEthBalance", [smartAccount]),
                };

                const wethBalanceCall = {
                    target: WETHAddress,
                    allowFailure: false,
                    callData: ERC20Interface.encodeFunctionData("balanceOf", [smartAccount]),
                };

                calls = [...calls, ethBalanceCall, wethBalanceCall];
            }
        });

        const provider = await getBestRPC();
        const Multicall = Multicall__factory.connect(MulticallAddress, provider);
        const results = await Multicall.callStatic.aggregate3(calls);

        const sortedBalances = sortedSmartAccounts.map((_smartAccount, index) => {
            let ethBalance: string;
            let wethBalance: string;
            let tokenBalance: string;

            if (tokenAvailable) {
                tokenBalance = tokenBalanceInfo.balances[index];
                const ethBalanceCalled = BigNumber.from(MulticallInterface.decodeFunctionResult("getEthBalance", results[2 * index].returnData)[0]);
                const wethBalanceCalled = BigNumber.from(ERC20Interface.decodeFunctionResult("balanceOf", results[2 * index + 1].returnData)[0]);
                //ethBalance = formatEther(wethBalanceCalled.add(ethBalanceCalled));
                ethBalance = formatEther(ethBalanceCalled);
                wethBalance = formatEther(wethBalanceCalled);
            } else {
                if (ethAvailable) {
                    tokenBalance = formatUnits(BigNumber.from(ERC20Interface.decodeFunctionResult("balanceOf", results[index].returnData)[0]), config.decimals);
                    ethBalance = ethBalanceInfo.balances[index];
                    wethBalance = wethBalanceInfo?.balances[index]!;
                } else {
                    tokenBalance = formatUnits(BigNumber.from(ERC20Interface.decodeFunctionResult("balanceOf", results[3 * index].returnData)[0]), config.decimals);
                    const ethBalanceCalled = BigNumber.from(MulticallInterface.decodeFunctionResult("getEthBalance", results[3 * index + 1].returnData)[0]);
                    const wethBalanceCalled = BigNumber.from(ERC20Interface.decodeFunctionResult("balanceOf", results[3 * index + 2].returnData)[0]);
                    //ethBalance = formatEther(wethBalanceCalled.add(ethBalanceCalled));
                    wethBalance = formatEther(wethBalanceCalled);
                    ethBalance = formatEther(ethBalanceCalled);
                }
            }

            return {
                wethBalance,
                ethBalance,
                tokenBalance,
            };
        });

        if (!tokenAvailable) {
            await TokenBalanceModel.updateOne(
                { telegramId, token, smartAccounts: sortedSmartAccounts },
                {
                    $set: {
                        balances: sortedBalances.map((b) => b.tokenBalance),
                    },
                },
                { upsert: true }
            );
        }
        if (!ethAvailable) {
            await TokenBalanceModel.updateOne(
                { telegramId, token: "0x0", smartAccounts: sortedSmartAccounts },
                {
                    $set: {
                        balances: sortedBalances.map((b) => b.ethBalance),
                    },
                },
                { upsert: true }
            );
            await TokenBalanceModel.updateOne(
                { telegramId, token: "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f", smartAccounts: sortedSmartAccounts },
                {
                    $set: {
                        balances: sortedBalances.map((b) => b.wethBalance),
                    },
                },
                { upsert: true }
            );
        }

        return smartAccounts.map((smartAccount) => {
            const index = sortedSmartAccounts.indexOf(smartAccount);
            return {
                wethBalance: sortedBalances[index].wethBalance,
                ethBalance: sortedBalances[index].ethBalance,
                tokenBalance: sortedBalances[index].tokenBalance,
            };
        });
    } catch (err) {
        console.log("Error = ", err);
        return smartAccounts.map((_smartAccount) => {
            return {
                ethBalance: "0",
                wethBalance: "0",
                tokenBalance: "0",
            };
        });
    }
}

export async function fetchRelayerBalance(relayer: string) {
    try {
        const relayerBalanceInfo = await RelayerBalanceModel.findOne({ relayer });

        //@ts-ignore
        const balanceAvailable = relayerBalanceInfo !== null && relayerBalanceInfo.updatedAt.getTime() + 10000 > Date.now();

        if (balanceAvailable) {
            return relayerBalanceInfo.balance;
        }

        const provider = await getBestRPC();

        const balance = formatEther(await provider.getBalance(relayer));

        await RelayerBalanceModel.updateOne(
            { relayer },
            {
                $set: {
                    balance,
                },
            },
            { upsert: true }
        );

        return balance;
    } catch (err) {
        return "0";
    }
}
