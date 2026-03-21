import { TransactionBuilder, Networks, Operation, BASE_FEE, nativeToScVal, scValToNative, rpc } from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL } from "./contracts";

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
          function: "get_balance", // <--- Esta es tu función de Rust
          args: [
            nativeToScVal(userAddress, { type: "address" })
          ],
        })
      )
      .setTimeout(30)
      .build();

    const response = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationSuccess(response) && response.result) {
      // Convertimos el i128 de Rust a BigInt de JS, y lo dividimos para sacar los XLM
      const balanceInStroops = scValToNative(response.result.retval);
      return Number(balanceInStroops) / 10000000;
    }
    return 0;
  } catch (error) {
    console.error("Error consultando get_balance:", error);
    return 0;
  }
}