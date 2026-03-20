import { useApp } from "@/context/AppContext";
import { Shield } from "lucide-react";
import piggyImg from "@/assets/piggy-saving.png";

const ProgressRing = () => {
  const { depositsCount, requiredDeposits, isUnlocked } = useApp();
  const progress = Math.min(depositsCount / requiredDeposits, 1);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={isUnlocked ? "hsl(var(--mint))" : "hsl(var(--purple))"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="progress-ring"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-extrabold text-foreground tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Reputación</span>
          </div>
          <p className="text-base font-bold text-foreground text-balance">
            {isUnlocked ? "¡Nivel Plata Alcanzado! 🎉" : "Camino al Nivel Plata"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {depositsCount} de {requiredDeposits} depósitos realizados
          </p>
        </div>
      </div>
      {!isUnlocked && depositsCount === 0 && (
        <div className="flex justify-center mt-3">
          <img src={piggyImg} alt="Alcancía" className="w-20 h-20 opacity-60" />
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
