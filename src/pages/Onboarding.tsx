import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import onboardingSave from "@/assets/onboarding-save.png";
import onboardingReputation from "@/assets/onboarding-reputation.png";
import onboardingCredit from "@/assets/onboarding-credit.png";

const steps = [
  {
    image: onboardingSave,
    title: "Ahorra poquito a poquito 🐷",
    description:
      "Cada semana guardas una parte de lo que ganas. No importa si es poco — lo que cuenta es la constancia. ¡Tú puedes!",
    bg: "from-teal-50 to-white",
  },
  {
    image: onboardingReputation,
    title: "Sube de nivel 🏆",
    description:
      "Con 3 depósitos seguidos alcanzas el Nivel Plata. Así demuestras que eres de fiar y te abres puertas a cosas increíbles.",
    bg: "from-orange-50 to-white",
  },
  {
    image: onboardingCredit,
    title: "¡Recibe tu crédito! 🎉",
    description:
      "Al llegar a Nivel Plata desbloqueas hasta 300 XLM de crédito. Sin papeleo, sin filas — directo a tu celular.",
    bg: "from-rose-50 to-white",
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isLast = current === steps.length - 1;
  const step = steps[current];

  const next = () => {
    if (isLast) {
      localStorage.setItem("vinculo_onboarded", "1");
      navigate("/", { replace: true });
    } else {
      setCurrent((p) => p + 1);
    }
  };

  const skip = () => {
    localStorage.setItem("vinculo_onboarded", "1");
    navigate("/", { replace: true });
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${step.bg} flex flex-col items-center justify-between px-6 py-8 overflow-hidden transition-colors duration-500`}
    >
      {/* Skip */}
      <div className="w-full flex justify-end">
        {!isLast && (
          <button
            onClick={skip}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            Omitir
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
        <div
          key={current}
          className="flex flex-col items-center text-center opacity-0 animate-fade-up"
          style={{ animationFillMode: "forwards" }}
        >
          <img
            src={step.image}
            alt={step.title}
            className="w-56 h-56 object-contain mb-8 drop-shadow-lg"
          />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-3 text-balance leading-snug">
            {step.title}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed text-pretty">
            {step.description}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-sm space-y-5">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-7 bg-accent"
                  : "w-2 bg-foreground/15"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          {isLast ? (
            <>
              <Sparkles className="w-5 h-5" />
              ¡Vamos allá!
            </>
          ) : (
            <>
              Siguiente
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
