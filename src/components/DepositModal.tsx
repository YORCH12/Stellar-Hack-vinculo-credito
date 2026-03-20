import { useState } from "react";
import { X, Fingerprint } from "lucide-react";
import { useApp } from "@/context/AppContext";
import confetti from "canvas-confetti";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DepositModal = ({ open, onClose }: Props) => {
  const { addDeposit, depositsCount, requiredDeposits, isUnlocked, setShowUnlockCelebration } = useApp();
  const [amount, setAmount] = useState("50");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setConfirming(true);
    setTimeout(() => {
      const wasLocked = !isUnlocked;
      const willUnlock = depositsCount + 1 >= requiredDeposits;
      addDeposit(val);
      setConfirming(false);
      setDone(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      if (wasLocked && willUnlock) {
        setTimeout(() => setShowUnlockCelebration(true), 600);
      }
      setTimeout(() => {
        setDone(false);
        setAmount("50");
        onClose();
      }, 1400);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8 animate-slide-up z-10">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary active:scale-95 transition-all">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6">Depositar Ganancias</h2>

        {done ? (
          <div className="flex flex-col items-center py-8 animate-scale-up">
            <svg viewBox="0 0 52 52" className="w-16 h-16 mb-4">
              <circle cx="26" cy="26" r="25" fill="hsl(var(--primary))" />
              <path
                fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                d="M14 27l7 7 16-16"
                strokeDasharray="100" strokeDashoffset="0"
                className="animate-check-draw"
              />
            </svg>
            <p className="text-lg font-semibold text-foreground">¡Depósito exitoso!</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Monto (XLM)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-bold text-foreground bg-secondary rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow tabular-nums"
                min="1"
              />
            </div>

            <div className="flex gap-2 mb-6">
              {[25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                    amount === String(v) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {v} XLM
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-60"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Firmando...
                </span>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  Confirmar con Freighter
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DepositModal;
