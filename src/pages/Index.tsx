import { useState } from "react";
import { Plus, FastForward } from "lucide-react";
import BalanceCard from "@/components/BalanceCard";
import ProgressRing from "@/components/ProgressRing";
import CreditSection from "@/components/CreditSection";
import ActivityList from "@/components/ActivityList";
import DepositModal from "@/components/DepositModal";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";

const Index = () => {
  const [depositOpen, setDepositOpen] = useState(false);
  const { simulateWeek } = useApp();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Vínculo</h1>
          <p className="text-xs text-muted-foreground">Construye tu reputación crediticia</p>
        </div>
        <button
          onClick={simulateWeek}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary rounded-full px-3 py-1.5 active:scale-95 transition-all hover:bg-secondary/80"
        >
          <FastForward className="w-3.5 h-3.5" />
          Simular 1 Semana
        </button>
      </header>

      {/* Content */}
      <main className="px-5 space-y-4 max-w-md mx-auto">
        {/* Mi Ahorro */}
        <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <BalanceCard />
          <button
            onClick={() => setDepositOpen(true)}
            className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base"
          >
            <Plus className="w-5 h-5" />
            Depositar Ganancias
          </button>
          <ProgressRing />
        </section>

        {/* Mi Crédito */}
        <section className="opacity-0 animate-fade-up" style={{ animationDelay: "250ms", animationFillMode: "forwards" }}>
          <CreditSection />
        </section>

        {/* Actividad */}
        <section className="opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          <ActivityList />
        </section>
      </main>

      <BottomNav />
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
};

export default Index;
