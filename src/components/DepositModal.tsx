import { useState } from "react";
import { X, Fingerprint, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import confetti from "canvas-confetti";
import { Horizon, TransactionBuilder, Networks, Operation, Asset, BASE_FEE } from "@stellar/stellar-sdk";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DESTINATION_ADDRESS = "GBS6IRXJN5N4D7KOAFD6ZGUYO4RFYEY6Q2ZZTGQDSWNDAGBFGOJVYVFE"; // Reemplaza con tu dirección de depósito real

const DepositModal = ({ open, onClose }: Props) => {
  const { addDeposit, depositsCount, requiredDeposits, isUnlocked, setShowUnlockCelebration } = useApp();
  const [amount, setAmount] = useState("50");
  const [step, setStep] = useState<"input" | "signing" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  if (!open) return null;

  const reset = () => {
    setStep("input");
    setAmount("50");
    setErrorMsg("");
    setTxHash("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    setStep("signing");
    setErrorMsg("");

    try {
      // 1. Verificar si Freighter está instalado
      const connected = await isConnected();
      if (!connected) {
        setErrorMsg("Freighter no está instalado. Descárgalo en freighter.app");
        setStep("error");
        return;
      }

      // 2. Solicitar acceso para obtener la llave pública
      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) {
        setErrorMsg("Conexión con Freighter rechazada. Intenta de nuevo.");
        setStep("error");
        return;
      }

      const sourcePublicKey = accessResult.address;

      // 3. Conectar a Horizon Testnet y cargar la cuenta
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(sourcePublicKey).catch(() => null);
      
      if (!account) {
        setErrorMsg("No se encontró tu cuenta en Stellar. Asegúrate de tener fondos en la Testnet.");
        setStep("error");
        return;
      }

      // 4. Construir la transacción con el SDK de Stellar
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: DESTINATION_ADDRESS,
            asset: Asset.native(), // XLM
            amount: String(val), // El monto debe pasarse como string
          })
        )
        .setTimeout(30) // Tiempo de expiración de la transacción (requerido)
        .build();

      // Convertir la transacción a formato XDR
      const xdr = transaction.toXDR();

      // 5. Solicitar a Freighter que firme el XDR
      const signResult = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });

      if (signResult.error || !signResult.signedTxXdr) {
        setErrorMsg("Firma rechazada en Freighter. Intenta de nuevo.");
        setStep("error");
        return;
      }

      // 6. Enviar la transacción firmada a la red de Stellar
      const submitRes = await fetch("https://horizon-testnet.stellar.org/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signResult.signedTxXdr)}`,
      });

      if (submitRes.ok) {
        const submitData = await submitRes.json();
        setTxHash(submitData.hash || "");
        
        // 7. Registrar el depósito localmente en la app
        const wasLocked = !isUnlocked;
        const willUnlock = depositsCount + 1 >= requiredDeposits;
        addDeposit(val);
        setStep("success");
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });

        if (wasLocked && willUnlock) {
          setTimeout(() => setShowUnlockCelebration(true), 800);
        }
      } else {
        const errorData = await submitRes.json();
        console.error("Error en Horizon:", errorData);
        setErrorMsg("La transacción falló en la red de Stellar.");
        setStep("error");
      }

    } catch (err) {
      console.error("Deposit error:", err);
      setErrorMsg("Ocurrió un error inesperado al procesar la transacción.");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={step === "signing" ? undefined : handleClose} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8 animate-slide-up z-10">
        {step !== "signing" && (
          <button onClick={handleClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary active:scale-95 transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* INPUT STEP */}
        {step === "input" && (
          <>
            <h2 className="text-xl font-bold text-foreground mb-6">Depositar Ganancias</h2>
            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Monto (XLM)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-bold text-foreground bg-secondary rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow tabular-nums"
                min="1"
              />
            </div>

            <div className="flex gap-2 mb-6">
              {[25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                    amount === String(v) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {v} XLM
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              className="btn-emerald w-full flex items-center justify-center gap-2 py-4 text-base"
            >
              <Fingerprint className="w-5 h-5" />
              Confirmar con Freighter
            </button>

            <p className="text-center text-[10px] text-muted-foreground mt-3">
              Se abrirá Freighter para firmar la transacción
            </p>
          </>
        )}

        {/* SIGNING STEP */}
        {step === "signing" && (
          <div className="flex flex-col items-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Fingerprint className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">Firmando transacción...</p>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              Confirma en la extensión Freighter para completar el depósito
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mb-1">¡Depósito exitoso! 🎉</p>
            <p className="text-sm text-muted-foreground mb-1">
              Se depositaron <span className="font-bold text-foreground">{amount} XLM</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">El monto ya fue registrado en tu cuenta</p>

            {txHash && (
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

        {/* ERROR STEP */}
        {step === "error" && (
          <div className="flex flex-col items-center py-8 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-lg font-bold text-foreground mb-2">Error en el depósito</p>
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
  );
};
export default DepositModal;