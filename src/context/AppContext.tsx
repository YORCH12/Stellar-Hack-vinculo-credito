import React, { createContext, useContext, useState, useCallback } from "react";

export interface Deposit {
  id: string;
  amount: number;
  date: Date;
  label: string;
}

interface AppState {
  balance: number;
  deposits: Deposit[];
  depositsCount: number;
  requiredDeposits: number;
  isUnlocked: boolean;
  creditAmount: number;
  creditWithdrawn: boolean;
}

interface AppContextType extends AppState {
  addDeposit: (amount: number) => void;
  simulateWeek: () => void;
  withdrawCredit: () => void;
  showSuccess: boolean;
  setShowSuccess: (v: boolean) => void;
  showUnlockCelebration: boolean;
  setShowUnlockCelebration: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    balance: 0,
    deposits: [],
    depositsCount: 0,
    requiredDeposits: 3,
    isUnlocked: false,
    creditAmount: 300,
    creditWithdrawn: false,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);

  const addDeposit = useCallback((amount: number) => {
    setState((prev) => {
      const newCount = prev.depositsCount + 1;
      const unlocked = newCount >= prev.requiredDeposits;
      return {
        ...prev,
        balance: prev.balance + amount,
        depositsCount: newCount,
        isUnlocked: unlocked,
        deposits: [
          {
            id: crypto.randomUUID(),
            amount,
            date: new Date(),
            label: `Depósito semanal #${newCount}`,
          },
          ...prev.deposits,
        ],
      };
    });
  }, []);

  const simulateWeek = useCallback(() => {
    const amount = 50;
    setState((prev) => {
      const newCount = prev.depositsCount + 1;
      const unlocked = newCount >= prev.requiredDeposits;
      const wasLocked = !prev.isUnlocked;
      if (wasLocked && unlocked) {
        setTimeout(() => setShowUnlockCelebration(true), 400);
      }
      return {
        ...prev,
        balance: prev.balance + amount,
        depositsCount: newCount,
        isUnlocked: unlocked,
        deposits: [
          {
            id: crypto.randomUUID(),
            amount,
            date: new Date(Date.now() + newCount * 7 * 24 * 60 * 60 * 1000),
            label: `Depósito semanal #${newCount}`,
          },
          ...prev.deposits,
        ],
      };
    });
    setShowSuccess(true);
  }, []);

  const withdrawCredit = useCallback(() => {
    setState((prev) => ({ ...prev, creditWithdrawn: true }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        addDeposit,
        simulateWeek,
        withdrawCredit,
        showSuccess,
        setShowSuccess,
        showUnlockCelebration,
        setShowUnlockCelebration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
