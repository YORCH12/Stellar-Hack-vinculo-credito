import { useApp } from "@/context/AppContext";
import { ArrowUpRight } from "lucide-react";
import emptyImg from "@/assets/empty-state.png";

const ActivityList = () => {
  const { deposits } = useApp();

  if (deposits.length === 0) {
    return (
      <div className="card-elevated p-8 flex flex-col items-center text-center">
        <img src={emptyImg} alt="Sin actividad" className="w-28 h-28 mb-3" />
        <p className="text-sm font-bold text-foreground mb-0.5">Sin actividad aún</p>
        <p className="text-xs text-muted-foreground">Realiza tu primer depósito para comenzar</p>
      </div>
    );
  }

  return (
    <div className="card-elevated divide-y divide-border">
      <div className="px-5 py-3">
        <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Actividad Reciente</span>
      </div>
      {deposits.slice(0, 5).map((d, i) => (
        <div
          key={d.id}
          className="flex items-center gap-3 px-5 py-3.5 opacity-0 animate-fade-up"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{d.label}</p>
            <p className="text-xs text-muted-foreground">
              {d.date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </p>
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">+{d.amount} XLM</span>
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
