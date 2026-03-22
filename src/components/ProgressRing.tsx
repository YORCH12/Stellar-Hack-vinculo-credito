import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Shield, Star, Crown, Gem, Trophy, Activity, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom"; // IMPORTANTE: Importamos useNavigate

interface Level {
  name: string;
  emoji: string;
  icon: React.ElementType;
  minScore: number;
  color: string;
  creditAmount?: number;
  minDeposits?: number;
}

const LEVELS: Level[] = [
  { name: "Bronce", emoji: "🥉", icon: Shield, minScore: 0, color: "var(--sky)", creditAmount: 50, minDeposits: 0 },
  { name: "Plata", emoji: "🥈", icon: Star, minScore: 50, color: "var(--sky)", creditAmount: 150, minDeposits: 3 },
  { name: "Oro", emoji: "🥇", icon: Crown, minScore: 150, color: "var(--deep)", creditAmount: 500, minDeposits: 5 },
  { name: "Diamante", emoji: "💎", icon: Gem, minScore: 500, color: "var(--grape)", creditAmount: 1000, minDeposits: 10 },
  { name: "Élite", emoji: "🏆", icon: Trophy, minScore: 1000, color: "var(--grape)", creditAmount: 2000, minDeposits: 20 },
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
  const navigate = useNavigate();
  const { deposits } = useApp();
  const [riskScore, setRiskScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 NUEVOS ESTADOS PARA COMPARAR
  const [onChainTier, setOnChainTier] = useState(0); 
  const [needsMinting, setNeedsMinting] = useState(false);
  const [levelToMint, setLevelToMint] = useState<Level | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRiskScore = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("user_id", user.id)
          .single();

        const wallet = profile?.wallet_address;
        if (!wallet) return;

        const [onChainRes, scoreRes] = await Promise.all([
          fetch("http://localhost:3000/api/get-available-credit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAddress: wallet })
          }),
          fetch("http://localhost:3000/api/calculate-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: wallet, deposits: deposits })
          })
        ]);

        const onChainData = await onChainRes.json();
        const scoreData = await scoreRes.json();

        if (!isMounted) return;

        // Mapeamos el Nivel del contrato a su puntaje base correspondiente
        const tierToScore: Record<number, number> = {
          0: 0, 1: 50, 2: 150, 3: 500, 4: 1000
        };

        const blockchainTier = onChainData.tier || 0;
        const baseScoreFromNFT = tierToScore[blockchainTier] || 0;
        const dynamicScore = scoreData.score || 0;

        // Definimos el score más alto que se mostrará en pantalla
        const finalScore = Math.max(baseScoreFromNFT, dynamicScore);
        
        setRiskScore(finalScore);
        setOnChainTier(blockchainTier);

        // 🚀 LÓGICA DE ACTUALIZACIÓN DE SBT
        // Calculamos qué nivel de NFT DEBERÍA tener según su dynamicScore
        const calculatedTier = scoreData.tier || 0;
        
        // Si el nivel que merece (calculatedTier) es mayor al que tiene minteado (blockchainTier), necesita mintear
        if (calculatedTier > blockchainTier && calculatedTier >= 1) {
          setNeedsMinting(true);
          // Buscamos la info visual de ese nivel para el botón
          setLevelToMint(LEVELS[calculatedTier] || LEVELS[1]);
        } else {
          setNeedsMinting(false);
        }

      } catch (error) {
        console.error("❌ Error sincronizando ProgressRing:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRiskScore();
    
    return () => { isMounted = false; };
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

  if (isLoading) {
    return (
      <div className="card-elevated p-5 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="card-elevated p-5 transition-all duration-500 flex flex-col gap-4">
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

      {/* 🚀 BOTÓN DE RECLAMO (Solo aparece si el score merece un NFT mayor al que tiene) */}
      {needsMinting && levelToMint && (
        <div className="mt-2 pt-3 border-t border-border/50 animate-fade-in">
          <button 
            onClick={() => navigate('/perfil')} // Asume que la ruta de Perfil es /perfil
            className="w-full flex items-center justify-between bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-xl transition-colors font-semibold text-sm group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{levelToMint.emoji}</span>
              <span>Reclamar NFT {levelToMint.name} disponible</span>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;