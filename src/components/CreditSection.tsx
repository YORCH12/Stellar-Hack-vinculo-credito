import { Lock, Sparkles, ArrowDownToLine } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import confetti from "canvas-confetti";
import celebrationImg from "@/assets/celebration.png";

const CreditSection = () => {
  const { isUnlocked, creditAmount, creditWithdrawn, withdrawCredit, showUnlockCelebration, setShowUnlockCelebration } = useApp();
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      withdrawCredit();
      setWithdrawing(false);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }, 1500);
  };

  if (showUnlockCelebration) {
    setTimeout(() => setShowUnlockCelebration(false), 4000);
  }

  if (!isUnlocked) {
    return (
      <div className="card-elevated p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-secondary/60 backdrop-blur-[1px]" />
        <div className="relative flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground mb-1">Crédito Bloqueado 🔒</p>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            Sigue ahorrando para desbloquear tu crédito de <span className="font-bold text-foreground">{creditAmount} XLM</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-elevated p-6 border-2 border-primary/20 transition-all duration-700 ${showUnlockCelebration ? "unlock-glow animate-scale-up" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold tracking-wide uppercase text-primary">Mi Crédito</span>
      </div>

      {creditWithdrawn ? (
        <div className="py-4 text-center">
          <img src={celebrationImg} alt="Celebración" className="w-24 h-24 mx-auto mb-2" />
          <p className="text-lg font-bold text-foreground">Crédito Retirado ✅</p>
          <p className="text-sm text-muted-foreground mt-1">{creditAmount} XLM transferidos a tu wallet</p>
        </div>
      ) : (
        <>
          {showUnlockCelebration && (
            <div className="bg-primary/10 rounded-xl p-3 mb-4 mt-2 flex items-center gap-3">
              <img src={celebrationImg} alt="Celebración" className="w-12 h-12" />
              <p className="text-sm font-bold text-primary">
                🎉 ¡Nivel Plata Alcanzado! Tienes un crédito disponible
              </p>
            </div>
          )}
          <div className="flex items-baseline gap-1 mt-3 mb-1">
            <span className="text-3xl font-extrabold text-foreground tabular-nums">{creditAmount}</span>
            <span className="text-lg font-semibold text-muted-foreground">XLM</span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Crédito disponible</p>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base animate-pulse-brand disabled:animate-none disabled:opacity-60"
          >
            {withdrawing ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              <>
                <ArrowDownToLine className="w-5 h-5" />
                Retirar Crédito
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default CreditSection;
