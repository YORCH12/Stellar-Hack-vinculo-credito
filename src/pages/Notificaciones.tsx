import { useState } from "react";
import { Bell, BellOff, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "deposit" | "credit" | "system";
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Depósito confirmado",
    message: "Tu depósito de 50 XLM fue procesado exitosamente.",
    time: "Hace 2 horas",
    read: false,
    type: "deposit",
  },
  {
    id: "2",
    title: "¡Sigue así! 💪",
    message: "Llevas 2 depósitos consecutivos. ¡Uno más para Nivel Plata!",
    time: "Hace 1 día",
    read: false,
    type: "system",
  },
  {
    id: "3",
    title: "Bienvenido a Vin",
    message: "Tu cuenta ha sido creada exitosamente. ¡Comienza a ahorrar!",
    time: "Hace 3 días",
    read: true,
    type: "system",
  },
];

const typeIcon = {
  deposit: "💰",
  credit: "🏆",
  system: "✨",
};

const Notificaciones = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} sin leer</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary active:scale-95 transition-transform"
          >
            <Check className="w-3.5 h-3.5" />
            Marcar todo
          </button>
        )}
      </header>

      <main className="px-5 max-w-md mx-auto">
        {notifications.length === 0 ? (
          <div className="card-elevated p-10 flex flex-col items-center text-center opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <BellOff className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Sin notificaciones</p>
            <p className="text-xs text-muted-foreground">Te avisaremos cuando haya novedades</p>
          </div>
        ) : (
          <div className="card-elevated divide-y divide-border opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
            {notifications.map((n, i) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left flex items-start gap-3 px-5 py-4 transition-colors active:bg-secondary/50 ${
                  !n.read ? "bg-primary/[0.03]" : ""
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-lg mt-0.5 flex-shrink-0">{typeIcon[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!n.read ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                      {n.title}
                    </p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notificaciones;
