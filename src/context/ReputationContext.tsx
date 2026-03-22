import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LEVELS,
  TIER_TO_BASE_SCORE,
  getCurrentLevel,
  type ReputationLevel,
} from "@/lib/reputationLevels";

export const VYN_WALLET_UPDATED_EVENT = "vyn-wallet-updated";

export interface ReputationValue {
  loading: boolean;
  /** Trust score mostrado en UI (max entre simulación y piso del NFT). */
  score: number;
  displayLevel: ReputationLevel;
  backendTier: number;
  backendTierName: string;
  onChainTier: number;
  availableCredit: number;
  /** Nombre del tier on-chain (p. ej. Platino) para crédito. */
  creditTierName: string;
  /** Wallet registrada en Supabase (misma que usa el motor). */
  walletAddress: string | null;
  needsMinting: boolean;
  levelToMint: ReputationLevel | null;
  error: string | null;
  refresh: () => void;
}

const defaultValue: ReputationValue = {
  loading: true,
  score: 0,
  displayLevel: LEVELS[0],
  backendTier: 0,
  backendTierName: "Bronce",
  onChainTier: 0,
  availableCredit: 0,
  creditTierName: "Bronce",
  walletAddress: null,
  needsMinting: false,
  levelToMint: null,
  error: null,
  refresh: () => {},
};

const ReputationContext = createContext<ReputationValue>(defaultValue);

export const useReputation = () => useContext(ReputationContext);

export const ReputationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { deposits } = useApp();
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [state, setState] = useState<Omit<ReputationValue, "refresh" | "walletAddress">>({
    loading: true,
    score: 0,
    displayLevel: LEVELS[0],
    backendTier: 0,
    backendTierName: "Bronce",
    onChainTier: 0,
    availableCredit: 0,
    creditTierName: "Bronce",
    needsMinting: false,
    levelToMint: null,
    error: null,
  });

  const loadWallet = useCallback(async () => {
    if (!user) {
      setWalletAddress(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .single();
    setWalletAddress(data?.wallet_address ?? null);
  }, [user]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const onWallet = () => void loadWallet();
    window.addEventListener(VYN_WALLET_UPDATED_EVENT, onWallet);
    return () => window.removeEventListener(VYN_WALLET_UPDATED_EVENT, onWallet);
  }, [loadWallet]);

  const fetchSnapshot = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
    const depPayload = deposits.map((d) => ({ amount: d.amount, daysAgo: d.daysAgo }));

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const scorePromise = fetch(`${API_BASE}/api/calculate-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress || "SIMULACION", deposits: depPayload }),
      });

      const creditPromise = walletAddress
        ? fetch(`${API_BASE}/api/get-available-credit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAddress: walletAddress }),
          })
        : Promise.resolve(null);

      const [scoreRes, creditRes] = await Promise.all([scorePromise, creditPromise]);
      const scoreData = await scoreRes.json();

      let onChainData: {
        tier?: number;
        tierName?: string;
        availableCredit?: number;
        success?: boolean;
      } = { tier: 0, tierName: "Bronce", availableCredit: 0 };

      if (creditRes) {
        const parsed = await creditRes.json();
        if (!parsed.error) {
          onChainData = parsed;
        }
      }

      const blockchainTier = Number(onChainData.tier ?? 0);
      const baseScoreFromNFT = TIER_TO_BASE_SCORE[blockchainTier] ?? 0;
      const dynamicScore = Number(scoreData.score ?? 0);
      const finalScore = Math.max(baseScoreFromNFT, dynamicScore);

      const calculatedTier = Number(scoreData.tier ?? 0);

      let needsMinting = false;
      let levelToMint: ReputationLevel | null = null;
      if (walletAddress && calculatedTier > blockchainTier && calculatedTier >= 1) {
        needsMinting = true;
        levelToMint = LEVELS[calculatedTier] ?? LEVELS[1];
      }

      setState({
        loading: false,
        score: finalScore,
        displayLevel: getCurrentLevel(finalScore),
        backendTier: calculatedTier,
        backendTierName: String(scoreData.tierName ?? "Bronce"),
        onChainTier: blockchainTier,
        availableCredit: Number(onChainData.availableCredit ?? 0),
        creditTierName: String(onChainData.tierName ?? "Bronce"),
        needsMinting,
        levelToMint,
        error: null,
      });
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: "No se pudo sincronizar la reputación",
      }));
    }
  }, [user, deposits, walletAddress]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void fetchSnapshot(), 8000);
    return () => window.clearInterval(id);
  }, [user, fetchSnapshot]);

  const value = useMemo<ReputationValue>(
    () => ({
      ...state,
      walletAddress,
      refresh: fetchSnapshot,
    }),
    [state, walletAddress, fetchSnapshot]
  );

  return <ReputationContext.Provider value={value}>{children}</ReputationContext.Provider>;
};
