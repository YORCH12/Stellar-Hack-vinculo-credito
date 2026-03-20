const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// Helpers matemáticos
// ─────────────────────────────────────────────

/**
 * Calcula la Media Ponderada de los montos.
 * Los depósitos más recientes (menor daysAgo) reciben mayor peso.
 * Peso = 1 / (daysAgo + 1)  → evita división por cero cuando daysAgo = 0.
 *
 * @param {{ amount: number, daysAgo: number }[]} deposits
 * @returns {number}
 */
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

/**
 * Calcula la Desviación Absoluta Media (MAD) de los montos.
 * MAD = mean( |xᵢ - mean(x)| )
 *
 * @param {{ amount: number }[]} deposits
 * @returns {number}
 */
function meanAbsoluteDeviation(deposits) {
  const amounts = deposits.map((d) => d.amount);
  const mean = amounts.reduce((acc, v) => acc + v, 0) / amounts.length;
  const mad =
    amounts.reduce((acc, v) => acc + Math.abs(v - mean), 0) / amounts.length;
  return mad;
}

/**
 * Calcula el Trust Score final y asigna el nivel de SBT.
 *
 * Fórmula:
 *   Score = (WeightedMean * (1 - (MAD / WeightedMean))) * ln(n + 1)
 *         = (WeightedMean - MAD) * ln(n + 1)
 *
 * Regla de seguridad: si MAD > WeightedMean → Score = 0 (alto riesgo).
 *
 * Niveles SBT:
 *   Score > 500  → Nivel 3 (Oro)
 *   Score > 150  → Nivel 2 (Plata)
 *   Score > 50   → Nivel 1 (Bronce)
 *   Score ≤ 50   → Nivel 0
 *
 * @param {number} wMean
 * @param {number} mad
 * @param {number} n  — número de depósitos
 * @returns {{ score: number, tier: number, tierName: string }}
 */
function computeScoreAndTier(wMean, mad, n) {
  let score = 0;

  if (wMean > 0 && mad <= wMean) {
    score = (wMean * (1 - mad / wMean)) * Math.log(n + 1);
    // Equivalente a: (wMean - mad) * ln(n + 1)
  }
  // Si MAD > WeightedMean → score permanece en 0 (alto riesgo)

  let tier = 0;
  let tierName = "Sin nivel";

  if (score > 500) {
    tier = 3;
    tierName = "Oro";
  } else if (score > 150) {
    tier = 2;
    tierName = "Plata";
  } else if (score > 50) {
    tier = 1;
    tierName = "Bronce";
  }

  return { score: parseFloat(score.toFixed(4)), tier, tierName };
}

// ─────────────────────────────────────────────
// Endpoint principal
// ─────────────────────────────────────────────

/**
 * POST /api/calculate-score
 *
 * Body:
 * {
 *   "address": "G...",
 *   "deposits": [
 *     { "amount": 100, "daysAgo": 10 },
 *     { "amount": 200, "daysAgo": 2  }
 *   ]
 * }
 *
 * Response:
 * {
 *   "address": "G...",
 *   "weightedMean": 166.67,
 *   "mad": 33.33,
 *   "score": 123.45,
 *   "tier": 2,
 *   "tierName": "Plata"
 * }
 */
app.post("/api/calculate-score", (req, res) => {
  const { address, deposits } = req.body;

  // ── Validaciones básicas ──────────────────
  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json({ error: "Campo 'address' requerido (string)." });
  }

  if (!Array.isArray(deposits) || deposits.length === 0) {
    return res
      .status(400)
      .json({ error: "Campo 'deposits' debe ser un arreglo no vacío." });
  }

  for (const dep of deposits) {
    if (
      typeof dep.amount !== "number" ||
      dep.amount < 0 ||
      typeof dep.daysAgo !== "number" ||
      dep.daysAgo < 0
    ) {
      return res.status(400).json({
        error:
          "Cada depósito debe tener 'amount' y 'daysAgo' como números no negativos.",
      });
    }
  }

  // ── Cálculo ───────────────────────────────
  const wMean = weightedMean(deposits);
  const mad = meanAbsoluteDeviation(deposits);
  const { score, tier, tierName } = computeScoreAndTier(
    wMean,
    mad,
    deposits.length
  );

  return res.json({
    address,
    weightedMean: parseFloat(wMean.toFixed(4)),
    mad: parseFloat(mad.toFixed(4)),
    score,
    tier,
    tierName,
  });
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vinculo-risk-engine", port: PORT });
});

// ─────────────────────────────────────────────
// Arranque del servidor
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Vínculo Risk Engine corriendo en http://localhost:${PORT}`);
});

module.exports = app; // útil para tests
