import { Wallet } from "lucide-react";
import { useApp } from "@/context/AppContext";
import walletImg from "@/assets/wallet-friendly.png";

const BalanceCard = () => {
  const { balance } = useApp();

  return (
    <div className="card-gradient p-6 relative overflow-hidden">
      <img
        src={walletImg}
        alt=""
        className="absolute -right-4 -bottom-4 w-24 h-24 opacity-30 pointer-events-none"
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 opacity-70" />
          <span className="text-sm font-medium opacity-70 tracking-wide uppercase">Mi Ahorro</span>
        </div>
        <div className="flex items-baseline gap-1 mt-3">
          <span className="text-4xl font-bold tracking-tight tabular-nums">{balance}</span>
          <span className="text-lg font-medium opacity-60">XLM</span>
        </div>
        <p className="text-sm opacity-50 mt-1">Saldo disponible</p>
      </div>
    </div>
  );
};

export default BalanceCard;
