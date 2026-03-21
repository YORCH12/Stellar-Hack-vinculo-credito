const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Keypair, rpc, TransactionBuilder, Networks, Operation, BASE_FEE, nativeToScVal } = require("@stellar/stellar-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);

// ─────────────────────────────────────────────
// Helpers Matemáticos
// ─────────────────────────────────────────────
function weightedMean(deposits) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { amount, daysAgo } of deposits) {
    const weight = 1 / (daysAgo + 1);
    weightedSum += amount * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

function meanAbsoluteDeviation(deposits) {
  if (deposits.length === 0) return 0;
  const amounts = deposits.map((d) => d.amount);
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
// Función para mintear en Stellar 🚀
// ─────────────────────────────────────────────
async function mintNftOnChain(userAddress, tier) {
  try {
    console.log(`\n[NFT] 1️⃣ Iniciando proceso para Nivel ${tier} a ${userAddress}...`);
    
    const adminKeypair = Keypair.fromSecret(process.env.SECRET_KEY_ADMIN);
    console.log("[NFT] 2️⃣ Obteniendo cuenta Admin de la blockchain...");
    const account = await server.getAccount(adminKeypair.publicKey());
    
    console.log("[NFT] 3️⃣ Armando operación...");
    let transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(
        Operation.invokeContractFunction({
          contract: process.env.NFT_CONTRACT_ID,
          function: "mint", 
          args: [
            nativeToScVal(adminKeypair.publicKey(), { type: "address" }), // Quien autoriza
            nativeToScVal(userAddress, { type: "address" }),    // Quien recibe
            nativeToScVal(tier, { type: "u32" })                // El nivel
          ],
        })
      )
      .setTimeout(30).build();

    console.log("[NFT] 4️⃣ Simulando transacción en Soroban (prepareTransaction)...");
    transaction = await server.prepareTransaction(transaction);

    console.log("[NFT] 5️⃣ Transacción simulada OK. Firmando con llave maestra...");
    transaction.sign(adminKeypair);

    console.log("[NFT] 6️⃣ Enviando a la red Stellar...");
    const submitRes = await server.sendTransaction(transaction);
    console.log(`[NFT] 7️⃣ Respuesta de la red: ${submitRes.status}`);

    if (submitRes.status === "ERROR" || submitRes.status === "FAILED") {
      console.error("[NFT] ❌ Error de Soroban:", JSON.stringify(submitRes.errorResult, null, 2));
      throw new Error("Transacción rechazada por el Smart Contract.");
    }

    let txStatus = submitRes.status;
    let getTxRes;
    let intentos = 0; // 🚀 Evitamos el bucle infinito

    // Esperamos máximo 30 segundos (15 intentos x 2s)
    while ((txStatus === "PENDING" || txStatus === "NOT_FOUND") && intentos < 15) {
      console.log(`[NFT] ⏳ Esperando confirmación de la blockchain... (Intento ${intentos + 1}/15)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      getTxRes = await server.getTransaction(submitRes.hash);
      txStatus = getTxRes.status.toUpperCase();
      intentos++;
    }

    if (txStatus === "SUCCESS") {
      console.log(`[NFT] ✅ ¡ÉXITO TOTAL! Hash: ${submitRes.hash}\n`);
      return { success: true, hash: submitRes.hash };
    } else {
      console.error(`[NFT] ❌ Falló o Caducó. Estado final: ${txStatus}\n`);
      throw new Error(`La red devolvió estado: ${txStatus}`);
    }

  } catch (error) {
    console.error("❌ [NFT ERROR CRÍTICO]", error?.response?.data || error.message);
    return { success: false, error: error.message };
  }
} // 👈 AQUÍ FALTABA ESTA LLAVE DE CIERRE.

// ─────────────────────────────────────────────
// Endpoints API
// ─────────────────────────────────────────────

// 1. Para la rueda visual del Frontend
app.post("/api/calculate-score", (req, res) => {
  const { address, deposits } = req.body;
  if (!address || !Array.isArray(deposits)) return res.status(400).json({ error: "Datos inválidos" });

  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  const { score, tier, tierName } = computeScoreAndTier(wMean, mad, deposits.length);

  return res.json({ address, weightedMean: wMean, mad, score, tier, tierName });
});

// 2. Para el botón de "Reclamar NFT"
app.post('/api/evaluate-and-mint', async (req, res) => {
  const { userAddress, deposits } = req.body;

  if (!userAddress || !deposits) return res.status(400).json({ error: "Faltan datos" });

  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  const { score, tier, tierName } = computeScoreAndTier(wMean, mad, deposits.length);
  
  // Condición: Nivel 1 (Plata) o superior
  if (tier >= 1) {
    const mintResult = await mintNftOnChain(userAddress, tier);
    
    if (mintResult.success) {
      return res.json({ message: `¡Felicidades! SBT Nivel ${tierName} minteado.`, txHash: mintResult.hash, status: "minted" });
    } else {
      return res.status(500).json({ error: "Fallo al mintear en la blockchain", details: mintResult.error });
    }
  } else {
    return res.json({ message: `Aún eres nivel Bronce. Necesitas más score.`, status: "pending" });
  }
});

app.listen(PORT, () => { console.log(`🚀 Motor de Riesgo corriendo en http://localhost:${PORT}`); });