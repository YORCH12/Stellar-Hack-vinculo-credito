import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Shield, Star, Crown, Gem, Trophy, Activity } from "lucide-react";

interface Level {
  name: string;
  emoji: string;
  icon: React.ElementType;
  minScore: number;
  color: string;
}

const LEVELS: Level[] = [
  { name: "Bronce", emoji: "🥉", icon: Shield, minScore: 0, color: "var(--sky)" },
  { name: "Plata", emoji: "🥈", icon: Star, minScore: 50, color: "var(--sky)" },
  { name: "Oro", emoji: "🥇", icon: Crown, minScore: 150, color: "var(--deep)" },
  { name: "Diamante", emoji: "💎", icon: Gem, minScore: 500, color: "var(--grape)" },
  { name: "Élite", emoji: "🏆", icon: Trophy, minScore: 1000, color: "var(--grape)" },
];

export function getCurrentLevel(score: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.minScore) current = level;
  }
  return current;
}

export function getNextLevel(score: number): Level | null {
  for (const level of LEVELS) {
    if (score < level.minScore) return level;
  }
  return null;
}

const ProgressRing = () => {
  const { deposits } = useApp();
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    const fetchRiskScore = async () => {
      if (deposits.length === 0) return;

      try {
        const response = await fetch("http://localhost:3000/api/calculate-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: "SIMULACION_FRONTEND",
            deposits: deposits,
          }),
        });

        const data = await response.json();
        console.log("📊 Datos recibidos del Motor de Riesgo:", data); // <-- EL CHIVATO
        
        if (data.score !== undefined) {
          setRiskScore(data.score);
        }
      } catch (error) {
        console.error("❌ Error contactando al Motor de Riesgo (¿Está encendido el servidor?):", error);
      }
    };

    fetchRiskScore();
  }, [deposits]);

  const current = getCurrentLevel(riskScore);
  const next = getNextLevel(riskScore);

  const progress = next
    ? Math.min((riskScore - current.minScore) / (next.minScore - current.minScore), 1)
    : 1;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const Icon = current.icon;

  return (
    <div className="card-elevated p-5 transition-all duration-500">
      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={`hsl(${current.color})`}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-foreground tabular-nums leading-none">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Reputación</span>
          </div>
          
          <p className="text-base font-bold text-foreground text-balance">
            {next
              ? `Camino al Nivel ${next.name} ${next.emoji}`
              : `¡Nivel ${current.name} Máximo! ${current.emoji}`}
          </p>
          
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
            <Activity className="w-3.5 h-3.5 text-primary" />
            Trust Score: <span className="font-bold text-primary">{riskScore.toFixed(1)} pts</span>
          </div>

          <div className="flex gap-1.5 mt-3">
            {LEVELS.map((lvl) => {
              const achieved = riskScore >= lvl.minScore;
              return (
                <span
                  key={lvl.name}
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all duration-500 ${
                    achieved ? "bg-primary/15 text-primary scale-110" : "bg-secondary text-muted-foreground/50 grayscale"
                  }`}
                >
                  {lvl.emoji}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressRing;