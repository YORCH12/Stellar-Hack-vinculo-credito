import { useState } from "react";
import { ArrowLeft, ChevronDown, MessageCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const faqs = [
  {
    q: "¿Qué es Vin?",
    a: "Vin es una plataforma que te ayuda a construir historial financiero ahorrando pequeñas cantidades semanales en la red Stellar. Al demostrar constancia, desbloqueas acceso a microcréditos.",
  },
  {
    q: "¿Cómo funciona el ahorro?",
    a: "Cada semana depositas una cantidad de XLM (mínimo 25). Después de 3 depósitos consecutivos alcanzas Nivel Plata y desbloqueas tu primer crédito.",
  },
  {
    q: "¿Qué es XLM?",
    a: "XLM (Lumens) es la criptomoneda de la red Stellar. Es rápida, barata y accesible para enviar dinero a cualquier parte del mundo.",
  },
  {
    q: "¿Qué es Freighter?",
    a: "Freighter es una extensión de navegador que funciona como tu billetera digital en la red Stellar. La necesitas para conectar tu wallet y hacer depósitos. Descárgala en freighter.app",
  },
  {
    q: "¿Cómo desbloqueo el crédito?",
    a: "Realiza 3 depósitos semanales consecutivos para alcanzar Nivel Plata. Una vez desbloqueado, puedes retirar hasta 300 XLM de crédito directamente a tu wallet.",
  },
  {
    q: "¿Es seguro?",
    a: "Sí. Tus fondos están en la blockchain de Stellar y solo tú tienes acceso a tu wallet mediante Freighter. Vin nunca tiene acceso a tus claves privadas.",
  },
];

const Ayuda = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Centro de Ayuda</h1>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-5">
        {/* Quick help */}
        <div className="card-elevated p-5 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <p className="text-sm font-bold text-foreground mb-1">¿Necesitas ayuda?</p>
          <p className="text-xs text-muted-foreground mb-4">
            Revisa las preguntas frecuentes o contáctanos directamente.
          </p>
          <a
            href="mailto:soporte@vin.app"
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline active:scale-[0.97] transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar soporte
          </a>
        </div>

        {/* FAQ */}
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
          <p className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3 px-1">
            Preguntas frecuentes
          </p>
          <div className="card-elevated divide-y divide-border">
            {faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left px-5 py-4 active:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{faq.q}</p>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-40 mt-2 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* External links */}
        <div className="opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          <p className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3 px-1">
            Recursos
          </p>
          <div className="card-elevated divide-y divide-border">
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3.5 active:bg-secondary/50 transition-colors"
            >
              <span className="text-lg">🔗</span>
              <span className="flex-1 text-sm font-medium text-foreground">Descargar Freighter</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
            <a
              href="https://stellar.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3.5 active:bg-secondary/50 transition-colors"
            >
              <span className="text-lg">⭐</span>
              <span className="flex-1 text-sm font-medium text-foreground">Sobre Stellar Network</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-2">Vin v1.0 · Stellar Network</p>
      </main>
    </div>
  );
};

export default Ayuda;
