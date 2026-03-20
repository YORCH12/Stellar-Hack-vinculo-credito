import { useApp } from "@/context/AppContext";
import { ArrowUpRight, PiggyBank, ArrowDownToLine, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import logoVin from "@/assets/logo-vin.png";

const Historial = () => {
  const { deposits, creditWithdrawn, creditAmount } = useApp();

  const allTransactions = [
    ...deposits.map((d) => ({
      id: d.id,
      type: "deposit" as const,
      amount: d.amount,
      label: d.label,
      date: d.date,
    })),
    ...(creditWithdrawn
      ? [
          {
            id: "credit-withdrawal",
            type: "withdrawal" as const,
            amount: creditAmount,
            label: "Retiro de crédito",
            date: new Date(),
          },
        ]
      : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const grouped = allTransactions.reduce<Record<string, typeof allTransactions>>((acc, tx) => {
    const key = tx.date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center gap-3">
        <img src={logoVin} alt="Vin" className="w-7 h-7 object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Historial</h1>
          <p className="text-xs text-muted-foreground">Todas tus transacciones</p>
        </div>
      </header>

      <main className="px-5 max-w-md mx-auto">
        {allTransactions.length === 0 ? (
          <div className="card-elevated p-10 flex flex-col items-center text-center opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <PiggyBank className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Sin transacciones</p>
            <p className="text-xs text-muted-foreground">Tus depósitos y retiros aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([month, txs], gi) => (
              <section
                key={month}
                className="opacity-0 animate-fade-up"
                style={{ animationDelay: `${gi * 100}ms`, animationFillMode: "forwards" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground capitalize">{month}</span>
                </div>
                <div className="card-elevated divide-y divide-border">
                  {txs.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === "deposit" ? "bg-primary/10" : "bg-accent/10"
                        }`}
                      >
                        {tx.type === "deposit" ? (
                          <ArrowUpRight className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowDownToLine className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.date.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          tx.type === "deposit" ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {tx.type === "deposit" ? "+" : "-"}{tx.amount} XLM
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {allTransactions.length > 0 && (
          <div className="card-navy p-5 mt-6 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <p className="text-xs font-semibold tracking-wide uppercase opacity-60 mb-3">Resumen</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold tabular-nums">{deposits.length}</p>
                <p className="text-xs opacity-60">Depósitos</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {deposits.reduce((s, d) => s + d.amount, 0)} <span className="text-sm font-medium opacity-60">XLM</span>
                </p>
                <p className="text-xs opacity-60">Total ahorrado</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Historial;
