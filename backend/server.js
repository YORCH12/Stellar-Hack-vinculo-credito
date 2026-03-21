const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Keypair, rpc, TransactionBuilder, Networks, Operation, BASE_FEE, nativeToScVal } = require("@stellar/stellar-sdk");

const app = express();
const PORT = process.env.PORT || 3000; // Usando el puerto 3001 que tenías

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
  let tierName = "Sin nivel";

  if (score > 500) { tier = 3; tierName = "Oro"; } 
  else if (score > 150) { tier = 2; tierName = "Plata"; } 
  else if (score > 50) { tier = 1; tierName = "Bronce"; }

  return { score: parseFloat(score.toFixed(4)), tier, tierName };
}

// ─────────────────────────────────────────────
// Endpoints API
// ─────────────────────────────────────────────
app.post("/api/calculate-score", (req, res) => {
  const { address, deposits } = req.body;
  if (!address || !Array.isArray(deposits)) return res.status(400).json({ error: "Datos inválidos" });

  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  const { score, tier, tierName } = computeScoreAndTier(wMean, mad, deposits.length);

  return res.json({ address, weightedMean: wMean, mad, score, tier, tierName });
});

app.listen(PORT, () => { console.log(`🚀 Motor de Riesgo corriendo en http://localhost:${PORT}`); });