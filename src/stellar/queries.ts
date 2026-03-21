import { TransactionBuilder, Networks, Operation, BASE_FEE, nativeToScVal, scValToNative, rpc } from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL } from "./contracts";

// 1. Función para obtener el saldo disponible (La que usaba BalanceCard)
export async function fetchContractBalance(userAddress: string): Promise<number> {
  try {
    const server = new rpc.Server(RPC_URL);
    const account = await server.getAccount(userAddress);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: "get_balance",
          args: [
            nativeToScVal(userAddress, { type: "address" })
          ],
        })
      )
      .setTimeout(30)
      .build();

    const response = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationSuccess(response) && response.result) {
      const balanceInStroops = scValToNative(response.result.retval);
      return Number(balanceInStroops) / 10000000;
    }
    return 0;
  } catch (error) {
    console.error("Error consultando get_balance:", error);
    return 0;
  }
}

// 2. Función para obtener los datos del Staking (La nueva para Retiros)
export async function fetchStakeInfo(userAddress: string) {
  try {
    const server = new rpc.Server(RPC_URL);
    const account = await server.getAccount(userAddress);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: CONTRACT_ID,
          function: "get_stake",
          args: [
            nativeToScVal(userAddress, { type: "address" })
          ],
        })
      )
      .setTimeout(30)
      .build();

    const response = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationSuccess(response) && response.result) {
      const resultVal = scValToNative(response.result.retval);
      // Soroban devuelve un Array con [monto, unlock_time, meses, apy]
      if (Array.isArray(resultVal)) {
        return {
          amount: Number(resultVal[0]) / 10000000,
          unlockTime: Number(resultVal[1]),
          months: Number(resultVal[2]),
          apy: Number(resultVal[3])
        };
      }
    }
    return { amount: 0, unlockTime: 0, months: 0, apy: 0 };
  } catch (error) {
    console.error("Error consultando get_stake:", error);
    return { amount: 0, unlockTime: 0, months: 0, apy: 0 };
  }
}