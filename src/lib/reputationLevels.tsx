import { Shield, Star, Crown, Gem, Trophy, type LucideIcon } from "lucide-react";

export interface ReputationLevel {
  name: string;
  emoji: string;
  icon: LucideIcon;
  minScore: number;
  color: string;
  creditAmount?: number;
  minDeposits?: number;
}

export const LEVELS: ReputationLevel[] = [
  { name: "Bronce", emoji: "🥉", icon: Shield, minScore: 0, color: "var(--sky)", creditAmount: 50, minDeposits: 0 },
  { name: "Plata", emoji: "🥈", icon: Star, minScore: 50, color: "var(--sky)", creditAmount: 150, minDeposits: 3 },
  { name: "Oro", emoji: "🥇", icon: Crown, minScore: 150, color: "var(--deep)", creditAmount: 500, minDeposits: 5 },
  { name: "Diamante", emoji: "💎", icon: Gem, minScore: 500, color: "var(--grape)", creditAmount: 1000, minDeposits: 10 },
  { name: "Élite", emoji: "🏆", icon: Trophy, minScore: 1000, color: "var(--grape)", creditAmount: 2000, minDeposits: 20 },
];

/** Puntos base asociados al tier del NFT on-chain (índice del contrato). */
export const TIER_TO_BASE_SCORE: Record<number, number> = {
  0: 0,
  1: 50,
  2: 150,
  3: 500,
  4: 1000,
};

export function getCurrentLevel(score: number): ReputationLevel {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.minScore) current = level;
  }
  return current;
}

export function getNextLevel(score: number): ReputationLevel | null {
  for (const level of LEVELS) {
    if (score < level.minScore) return level;
  }
  return null;
}
