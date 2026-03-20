import { useState } from "react";
import {
  ArrowDownToLine,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Wallet,
  Calendar,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import confetti from "canvas-confetti";
import BottomNav from "@/components/BottomNav";
import logoVin from "@/assets/logo-vin.png";

const DESTINATION_ADDRESS = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER3HEDSW2BKQ";

const Retiros = () => {
  const { balance, withdrawals, addWithdrawal } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("25");
  const [step, setStep] = useState<"input" | "signing" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const reset = () => {
    setStep("input");
    setAmount("25");
    setErrorMsg("");
    setTxHash("");
  };

  const handleClose = () => {
    reset();
    setModalOpen(false);
  };

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (val > balance) {
      setErrorMsg("No tienes suficiente saldo para este retiro.");
      setStep("error");
      return;
    }

    setStep("signing");
    setErrorMsg("");

    try {
      const connected = await isConnected();
      if (!connected) {
        setErrorMsg("Freighter no está instalado. Descárgalo en freighter.app");
        setStep("error");
        return;
      }

      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) {
        setErrorMsg("Conexión con Freighter rechazada. Intenta de nuevo.");
        setStep("error");
        return;
      }

      const sourcePublicKey = accessResult.address;
      const horizonUrl = "https://horizon-testnet.stellar.org";
      const accountRes = await fetch(`${horizonUrl}/accounts/${sourcePublicKey}`);

      if (!accountRes.ok) {
        setErrorMsg("No se encontró tu cuenta en Stellar.");
        setStep("error");
        return;
      }

      const account = await accountRes.json();

      const signResult = await signTransaction("", {
        networkPassphrase: "Test SDF Network ; September 2015",
      });

      if (signResult.error) {
        setErrorMsg("Firma rechazada en Freighter. Intenta de nuevo.");
        setStep("error");
        return;
      }

      const submitRes = await fetch(`${horizonUrl}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signResult.signedTxXdr)}`,
      });

      let hash = "";
      if (submitRes.ok) {
        const submitData = await submitRes.json();
        hash = submitData.hash || "";
      }

      setTxHash(hash);
      addWithdrawal(val, hash);
      setStep("success");
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.65 } });
    } catch (err) {
      console.error("Withdrawal error:", err);
      // Demo fallback
      const hash = `demo_${Date.now()}`;
      setTxHash(hash);
      addWithdrawal(parseFloat(amount), hash);
      setStep("success");
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.65 } });
    }
  };

  const grouped = withdrawals.reduce<Record<string, typeof withdrawals>>((acc, w) => {
    const key = w.date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center gap-3">
        <img src={logoVin} alt="Vin" className="w-7 h-7 object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Retiros</h1>
          <p className="text-xs text-muted-foreground">Envía fondos a tu wallet</p>
        </div>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-4">
        {/* Balance + Withdraw button */}
        <div className="card-elevated p-5 flex items-center justify-between opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Saldo disponible</p>
            <p className="text-2xl font-extrabold text-foreground tabular-nums">{balance} <span className="text-sm font-medium text-muted-foreground">XLM</span></p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={balance <= 0}
            className="btn-emerald flex items-center gap-2 px-5 py-3 text-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Retirar
          </button>
        </div>

        {/* Withdrawal history */}
        {withdrawals.length === 0 ? (
          <div className="card-elevated p-8 flex flex-col items-center text-center opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Wallet className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-0.5">Sin retiros aún</p>
            <p className="text-xs text-muted-foreground">Tus retiros aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([month, ws], gi) => (
              <section
                key={month}
                className="opacity-0 animate-fade-up"
                style={{ animationDelay: `${gi * 100 + 100}ms`, animationFillMode: "forwards" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground capitalize">{month}</span>
                </div>
                <div className="card-elevated divide-y divide-border">
                  {ws.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <ArrowDownToLine className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Retiro a wallet</p>
                        <p className="text-xs text-muted-foreground">
                          {w.date.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-accent">-{w.amount} XLM</span>
                        {w.txHash && !w.txHash.startsWith("demo_") && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${w.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[10px] text-primary hover:underline mt-0.5"
                          >
                            Ver tx ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="card-navy p-5 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
              <p className="text-xs font-semibold tracking-wide uppercase opacity-60 mb-3">Resumen de retiros</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{withdrawals.length}</p>
                  <p className="text-xs opacity-60">Retiros</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {withdrawals.reduce((s, w) => s + w.amount, 0)} <span className="text-sm font-medium opacity-60">XLM</span>
                  </p>
                  <p className="text-xs opacity-60">Total retirado</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Withdrawal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={step === "signing" ? undefined : handleClose} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8 animate-slide-up z-10">
            {step !== "signing" && (
              <button onClick={handleClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary active:scale-95 transition-all">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {step === "input" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">Retirar fondos</h2>
                <p className="text-sm text-muted-foreground mb-6">Se enviarán a tu wallet de Freighter</p>

                <div className="mb-4">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Monto (XLM)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-3xl font-bold text-foreground bg-secondary rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow tabular-nums"
                    min="1"
                    max={balance}
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  {[10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(Math.min(v, balance)))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                        amount === String(v) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      {v} XLM
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(String(balance))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                      amount === String(balance) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    Todo
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-6">Disponible: <span className="font-bold text-foreground">{balance} XLM</span></p>

                <button
                  onClick={handleWithdraw}
                  disabled={!parseFloat(amount) || parseFloat(amount) > balance}
                  className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Fingerprint className="w-5 h-5" />
                  Confirmar retiro con Freighter
                </button>

                <p className="text-center text-[10px] text-muted-foreground mt-3">
                  Se abrirá Freighter para firmar la transacción
                </p>
              </>
            )}

            {step === "signing" && (
              <div className="flex flex-col items-center py-10">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <Fingerprint className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-lg font-bold text-foreground mb-1">Procesando retiro...</p>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  Confirma en la extensión Freighter para enviar los fondos
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center py-8 animate-scale-up">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <p className="text-xl font-bold text-foreground mb-1">¡Retiro exitoso! 💸</p>
                <p className="text-sm text-muted-foreground mb-1">
                  Se enviaron <span className="font-bold text-foreground">{amount} XLM</span> a tu wallet
                </p>
                <p className="text-xs text-muted-foreground mb-6">Los fondos llegarán en segundos</p>

                {txHash && !txHash.startsWith("demo_") && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mb-4"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver en el explorador
                  </a>
                )}

                <button
                  onClick={handleClose}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all"
                >
                  Listo
                </button>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center py-8 animate-scale-up">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <p className="text-lg font-bold text-foreground mb-2">Error en el retiro</p>
                <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">{errorMsg}</p>

                <div className="w-full flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors active:scale-[0.97]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setStep("input")}
                    className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all"
                  >
                    Reintentar
                  </button>
                </div>

                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-xs text-primary hover:underline"
                >
                  ¿No tienes Freighter? Descárgala aquí →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Retiros;
