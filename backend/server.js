const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { 
  Keypair, 
  rpc, 
  TransactionBuilder, 
  Networks, 
  Operation, 
  BASE_FEE, 
  nativeToScVal, 
  scValToNative 
} = require("@stellar/stellar-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE CRÉDITO
// ─────────────────────────────────────────────

const CREDIT_LIMITS = {
  0: { name: "Bronce", amount: 0 },
  1: { name: "Plata", amount: 300 },
  2: { name: "Oro", amount: 600 },
  3: { name: "Diamante", amount: 1500 },
  4: { name: "Platino", amount: 5000 }
};

// ─────────────────────────────────────────────
// HELPERS MATEMÁTICOS
// ─────────────────────────────────────────────

function weightedMean(deposits = []) {
  if (!deposits || deposits.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { amount, daysAgo } of deposits) {
    const weight = 1 / (daysAgo + 1);
    weightedSum += (amount || 0) * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

function meanAbsoluteDeviation(deposits = []) {
  if (!deposits || deposits.length === 0) return 0;
  const amounts = deposits.map((d) => d.amount || 0);
  const mean = amounts.reduce((acc, v) => acc + v, 0) / amounts.length;
  return amounts.reduce((acc, v) => acc + Math.abs(v - mean), 0) / amounts.length;
}

function computeScoreAndTier(wMean, mad, n) {
  let score = 0;
  if (wMean > 0 && mad <= wMean) {
    score = (wMean * (1 - mad / wMean)) * Math.log(n + 1);
  }

  let tier = 0;
  let tierName = "Bronce";

  if (score >= 1000) { tier = 4; tierName = "Platino"; } 
  else if (score >= 500) { tier = 3; tierName = "Diamante"; } 
  else if (score >= 150) { tier = 2; tierName = "Oro"; } 
  else if (score >= 50) { tier = 1; tierName = "Plata"; }

  return { score: parseFloat(score.toFixed(4)), tier, tierName };
}

// ─────────────────────────────────────────────
// ENDPOINT: CONSULTAR CRÉDITO (SIMULACIÓN) 🔗
// ─────────────────────────────────────────────

app.post("/api/get-available-credit", async (req, res) => {
  const { userAddress } = req.body;
  if (!userAddress) return res.status(400).json({ error: "Falta wallet" });

  try {
    console.log(`[DEBUG] 🔍 Consultando Tier para: ${userAddress}`);

    // 1. Cargamos una cuenta temporal para la simulación
    const adminKeypair = Keypair.fromSecret(process.env.SECRET_KEY_ADMIN);
    const sourceAccount = await server.getAccount(adminKeypair.publicKey());

    // 2. Creamos la transacción de "lectura"
    const tx = new TransactionBuilder(sourceAccount, { 
      fee: BASE_FEE, 
      networkPassphrase: Networks.TESTNET 
    })
    .addOperation(
      Operation.invokeContractFunction({ // ✅ Nombre estándar
        contract: process.env.NFT_CONTRACT_ID,
        function: "get_tier",
        args: [nativeToScVal(userAddress, { type: "address" })]
      })
    )
    .setTimeout(30)
    .build();

    // 3. Simulamos la transacción para obtener el valor de retorno
    const simulation = await server.simulateTransaction(tx);

    let finalTier = 0;
    if (simulation.result && simulation.result.retval) {
      finalTier = Number(scValToNative(simulation.result.retval)) || 0;
    }

    const config = CREDIT_LIMITS[finalTier] || CREDIT_LIMITS[0];
    console.log(`[DEBUG] ✅ Tier: ${finalTier} (${config.name})`);

    return res.json({
      success: true,
      tier: finalTier,
      tierName: config.name,
      availableCredit: config.amount,
      currency: "XLM"
    });

  } catch (error) {
    console.error(`[DEBUG] 💥 Error en /get-available-credit:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// FUNCIÓN PARA MINTEAR NFT 🚀
// ─────────────────────────────────────────────

async function mintNftOnChain(userAddress, tier) {
  try {
    const adminKeypair = Keypair.fromSecret(process.env.SECRET_KEY_ADMIN);
    const account = await server.getAccount(adminKeypair.publicKey());
    
    let transaction = new TransactionBuilder(account, { 
        fee: BASE_FEE, 
        networkPassphrase: Networks.TESTNET 
    })
      .addOperation(
        Operation.invokeContractFunction({ // ✅ Nombre estándar
          contract: process.env.NFT_CONTRACT_ID,
          function: "mint", 
          args: [
            nativeToScVal(adminKeypair.publicKey(), { type: "address" }), 
            nativeToScVal(userAddress, { type: "address" }),    
            nativeToScVal(tier, { type: "u32" })                
          ],
        })
      )
      .setTimeout(30).build();

    transaction = await server.prepareTransaction(transaction);
    transaction.sign(adminKeypair);

    const submitRes = await server.sendTransaction(transaction);
    return { success: true, hash: submitRes.hash };

  } catch (error) {
    console.error(`[DEBUG] 💥 Error Mint:`, error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// OTROS ENDPOINTS
// ─────────────────────────────────────────────

app.post("/api/calculate-score", (req, res) => {
  const { deposits } = req.body;
  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  res.json(computeScoreAndTier(wMean, mad, (deposits || []).length));
});

app.post('/api/evaluate-and-mint', async (req, res) => {
  const { userAddress, deposits } = req.body;
  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  const { tier, tierName } = computeScoreAndTier(wMean, mad, (deposits || []).length);
  
  if (tier >= 1) {
    const mintResult = await mintNftOnChain(userAddress, tier);
    if (mintResult.success) return res.json({ txHash: mintResult.hash, status: "minted" });
  }
  res.json({ message: "Nivel insuficiente", status: "pending" });
});

app.listen(PORT, () => { 
  console.log(`\n🚀 SERVIDOR VÍNCULO ACTIVO EN PUERTO ${PORT}`);
});