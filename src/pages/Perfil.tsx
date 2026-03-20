import { useApp } from "@/context/AppContext";
import { User, Shield, Wallet, Star, ChevronRight, LogOut, HelpCircle, Bell } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Perfil = () => {
  const { balance, depositsCount, requiredDeposits, isUnlocked, creditWithdrawn } = useApp();
  const level = isUnlocked ? "Plata" : "Bronce";

  const menuItems = [
    { icon: Bell, label: "Notificaciones", detail: "Activadas" },
    { icon: HelpCircle, label: "Centro de ayuda", detail: "" },
    { icon: LogOut, label: "Cerrar sesión", detail: "", destructive: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Perfil</h1>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-4">
        {/* Avatar + Name */}
        <div className="card-elevated p-6 flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary-foreground">MC</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground">María Castillo</p>
            <p className="text-sm text-muted-foreground">Comerciante verificada</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <div className="card-elevated p-4 text-center">
            <Wallet className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-lg font-bold text-foreground tabular-nums">{balance}</p>
            <p className="text-[10px] text-muted-foreground font-medium">XLM Ahorrado</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <Star className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-lg font-bold text-foreground tabular-nums">{depositsCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Depósitos</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <Shield className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-lg font-bold text-foreground">{level}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Nivel</p>
          </div>
        </div>

        {/* Reputation card */}
        <div
          className={`card-elevated p-5 border-2 opacity-0 animate-fade-up ${
            isUnlocked ? "border-primary/20" : "border-transparent"
          }`}
          style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Estado de Reputación</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${Math.min((depositsCount / requiredDeposits) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{depositsCount} de {requiredDeposits} depósitos</span>
            <span className={isUnlocked ? "text-primary font-semibold" : ""}>{isUnlocked ? "✓ Desbloqueado" : "En progreso"}</span>
          </div>
          {creditWithdrawn && (
            <div className="mt-3 bg-emerald/10 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald">Crédito retirado exitosamente</p>
            </div>
          )}
        </div>

        {/* Wallet info */}
        <div className="card-elevated p-5 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Wallet Conectada</span>
          </div>
          <div className="bg-secondary rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Dirección Stellar</p>
            <p className="text-sm font-mono font-medium text-foreground truncate">GBXK...7WQR</p>
          </div>
        </div>

        {/* Menu */}
        <div className="card-elevated divide-y divide-border opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          {menuItems.map(({ icon: Icon, label, detail, destructive }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-secondary/50 transition-colors"
            >
              <Icon className={`w-4.5 h-4.5 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`flex-1 text-left text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>
                {label}
              </span>
              {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-2 pb-4">Vínculo v1.0 · Stellar Network</p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Perfil;
