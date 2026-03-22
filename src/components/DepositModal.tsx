import { useState, useEffect } from "react";
import { X, Fingerprint, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { 
  TransactionBuilder, 
  Networks, 
  Operation, 
  BASE_FEE, 
  nativeToScVal, 
  rpc, 
  Transaction 
} from "@stellar/stellar-sdk";

// Importamos tus constantes (asegúrate de que la ruta sea correcta)
import { CONTRACT_ID, RPC_URL } from "@/stellar/contracts";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DepositModal = ({ open, onClose }: Props) => {
  const { addDeposit, depositsCount, requiredDeposits, isUnlocked, setShowUnlockCelebration } = useApp();
  const [amount, setAmount] = useState("50");
  const [step, setStep] = useState<"input" | "signing" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  // 🔐 CANDADO DE SEGURIDAD PARA FREIGHTER
  const [registeredWallet, setRegisteredWallet] = useState<string | null>(null);

  // 📡 Obtenemos la wallet real del usuario desde Supabase al cargar el modal
  useEffect(() => {
    let isMounted = true;

    const fetchWallet = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("user_id", user.id)
          .single();

        if (profile?.wallet_address && isMounted) {
          setRegisteredWallet(profile.wallet_address);
        }
      } catch (error) {
        console.error("Error obteniendo la wallet registrada:", error);
      }
    };

    if (open) {
      fetchWallet();
    }

    return () => {
      isMounted = false;
    };
  }, [open]);

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
      // 1. Inicializar Servidor RPC y verificar conexión
      const server = new rpc.Server(RPC_URL);
      const connected = await isConnected();
      if (!connected) throw new Error("Instala Freighter para continuar");

      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) throw new Error("Acceso denegado");
      
      const sourcePublicKey = accessResult.address;

      // 🛡️ NUEVO CANDADO DE SEGURIDAD
      if (registeredWallet && sourcePublicKey !== registeredWallet) {
        const shortWallet = `${registeredWallet.substring(0, 4)}...${registeredWallet.substring(52)}`;
        throw new Error(`Cuenta incorrecta en Freighter. Por favor cambia a tu cuenta registrada: ${shortWallet}`);
      }

      const account = await server.getAccount(sourcePublicKey);
      const amountInStroops = BigInt(Math.floor(val * 10000000));

      // 2. Construir la transacción de invocación
      let transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: "deposit",
            args: [
              nativeToScVal(sourcePublicKey, { type: "address" }),
              nativeToScVal(amountInStroops, { type: "i128" }),
            ],
          })
        )
        .setTimeout(30)
        .build();

      // 3. Preparar la transacción (Calcula footprint y gas para Soroban)
      transaction = await server.prepareTransaction(transaction);

      // 4. Firmar con Freighter
      const signResult = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      if (signResult.error || !signResult.signedTxXdr) {
        throw new Error("Firma rechazada por el usuario");
      }

      // 5. Enviar a la red (Usamos as any para evitar errores estrictos de TS)
      const transactionToSubmit = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);
      const submitRes = await server.sendTransaction(transactionToSubmit) as any;

      // 6. Validar estado (Convertimos a mayúsculas para evitar el error anterior)
      const currentStatus = submitRes.status ? submitRes.status.toUpperCase() : "";

      if (currentStatus === "PENDING" || currentStatus === "SUCCESS") {
        setTxHash(submitRes.hash);
        
        // Actualizamos el estado local de la app
        const wasLocked = !isUnlocked;
        const willUnlock = depositsCount + 1 >= requiredDeposits;
        addDeposit(val);
        
        setStep("success");
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });

        if (wasLocked && willUnlock) {
          setTimeout(() => setShowUnlockCelebration(true), 800);
        }
      } else {
        console.error("Respuesta de la red fallida:", submitRes);
        throw new Error(submitRes.errorResultXdr || "La transacción fue rechazada por la red");
      }

    } catch (err: any) {
      console.error("Deposit Error Details:", err);
      setErrorMsg(err.message || "Error al procesar el depósito");
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
          </>
        )}

        {/* SIGNING STEP */}
        {step === "signing" && (
          <div className="flex flex-col items-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Fingerprint className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">Preparando contrato...</p>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              Calculando recursos y esperando confirmación en Freighter.
            </p>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === "success" && (
          <div className="flex flex-col items-center py-8 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mb-1">¡Depósito exitoso! 🎉</p>
            <p className="text-sm text-muted-foreground mb-4">
              Se depositaron <span className="font-bold text-foreground">{amount} XLM</span>
            </p>

            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mb-6"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositModal;