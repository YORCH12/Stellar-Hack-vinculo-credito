import { useApp } from "@/context/AppContext";
import { ArrowUpRight, PiggyBank } from "lucide-react";

const ActivityList = () => {
  const { deposits } = useApp();

  if (deposits.length === 0) {
    return (
      <div className="card-elevated p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
          <PiggyBank className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-0.5">Sin actividad aún</p>
        <p className="text-xs text-muted-foreground">Realiza tu primer depósito para comenzar</p>
      </div>
    );
  }

  return (
    <div className="card-elevated divide-y divide-border">
      <div className="px-5 py-3">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Actividad Reciente</span>
      </div>
      {deposits.slice(0, 5).map((d, i) => (
        <div
          key={d.id}
          className="flex items-center gap-3 px-5 py-3.5 opacity-0 animate-fade-up"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
        >
          <div className="w-9 h-9 rounded-full bg-emerald/10 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 text-emerald" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{d.label}</p>
            <p className="text-xs text-muted-foreground">
              {d.date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </p>
          </div>
          <span className="text-sm font-semibold text-emerald tabular-nums">+{d.amount} XLM</span>
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
