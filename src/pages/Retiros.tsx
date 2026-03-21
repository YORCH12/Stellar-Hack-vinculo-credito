import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownToLine, Fingerprint, CheckCircle2, AlertCircle, ExternalLink,
  X, Wallet, Calendar, Lock, TrendingUp, Clock, Sparkles, Unlock
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import confetti from "canvas-confetti";
import BottomNav from "@/components/BottomNav";
import logoVin from "@/assets/logo-vin.png";

import { TransactionBuilder, Networks, Operation, BASE_FEE, nativeToScVal, rpc } from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL } from "@/stellar/contracts";
import { fetchContractBalance, fetchStakeInfo } from "@/stellar/queries";

const STAKING_OPTIONS = [
  { months: 1, apy: 4, label: "1 Mes" },
  { months: 3, apy: 7, label: "3 Meses" },
  { months: 6, apy: 11, label: "6 Meses" },
  { months: 12, apy: 18, label: "12 Meses" },
];

const Retiros = () => {
  const { withdrawals, addWithdrawal } = useApp();
  
  const [realBalance, setRealBalance] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Estado real del staking on-chain
  const [onChainStake, setOnChainStake] = useState({ amount: 0, unlockTime: 0, months: 0, apy: 0 });
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [canUnstake, setCanUnstake] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("25");
  const [step, setStep] = useState<"input" | "signing" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("50");
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [stakeStep, setStakeStep] = useState<"input" | "signing" | "success" | "unstaking" | "error">("input");

  useEffect(() => {
    const initWallet = async () => {
      try {
        if (await isConnected()) {
          const access = await requestAccess();
          if (access.address) setWalletAddress(access.address);
        }
      } catch (error) { console.error("Error conectando Freighter:", error); }
    };
    initWallet();
  }, []);

  const loadData = useCallback(async (address: string) => {
    try {
      const [balance, stakeData] = await Promise.all([
        fetchContractBalance(address),
        fetchStakeInfo(address)
      ]);
      setRealBalance(balance);
      setOnChainStake(stakeData);
    } catch (error) { console.error("Error al cargar datos:", error); }
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    loadData(walletAddress);
    const intervalId = setInterval(() => loadData(walletAddress), 5000);
    return () => clearInterval(intervalId);
  }, [walletAddress, loadData]);

  // Reloj regresivo para el Unstake
  useEffect(() => {
    if (onChainStake.amount === 0) return;
    
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = onChainStake.unlockTime - now;
      if (diff <= 0) {
        setTimeLeftStr("¡Listo para retirar!");
        setCanUnstake(true);
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setTimeLeftStr(`${m}m ${s}s restantes`);
        setCanUnstake(false);
      }
    };
    
    updateTimer();
    const t = setInterval(updateTimer, 1000);
    return () => clearInterval(t);
  }, [onChainStake]);

  const handleClose = () => {
    setStep("input"); setAmount("25"); setErrorMsg(""); setTxHash("");
    setModalOpen(false);
    if (walletAddress) loadData(walletAddress);
  };

  const handleStakeClose = () => {
    setStakeStep("input"); setStakeAmount("50"); setSelectedMonths(3);
    setStakeModalOpen(false);
  };

  const processContractCall = async (functionName: string, args: any[], successStep: any) => {
    try {
      const server = new rpc.Server(RPC_URL);
      const connected = await isConnected();
      if (!connected) throw new Error("Instala Freighter");

      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) throw new Error("Acceso denegado");
      
      const account = await server.getAccount(accessResult.address);
      
      let transaction = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.invokeContractFunction({ contract: CONTRACT_ID, function: functionName, args }))
        .setTimeout(30).build();

      transaction = await server.prepareTransaction(transaction);
      const signResult = await signTransaction(transaction.toXDR(), { networkPassphrase: Networks.TESTNET });
      if (signResult.error || !signResult.signedTxXdr) throw new Error("Firma rechazada");

      const txToSubmit = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);
      const submitRes = await server.sendTransaction(txToSubmit) as any;
      const currentStatus = submitRes.status ? submitRes.status.toUpperCase() : "";
      if (currentStatus !== "PENDING" && currentStatus !== "SUCCESS") throw new Error("Rechazada por la red");

      let txStatus = currentStatus;
      while (txStatus === "PENDING" || txStatus === "NOT_FOUND") {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const res = await server.getTransaction(submitRes.hash);
        txStatus = res.status.toUpperCase();
      }

      if (txStatus === "SUCCESS") {
        if (walletAddress) loadData(walletAddress);
        setStakeStep(successStep);
        if (functionName === "withdraw") {
          setTxHash(submitRes.hash);
          addWithdrawal(parseFloat(amount), submitRes.hash);
          setStep("success");
        }
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });
      } else {
        throw new Error("Transacción fallida en el contrato");
      }
    } catch (err: any) {
      console.error(err);
      if (functionName === "withdraw") { setErrorMsg(err.message); setStep("error"); }
      else { alert(err.message); setStakeStep("input"); }
    }
  };

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > realBalance) { setErrorMsg("Saldo insuficiente"); setStep("error"); return; }
    setStep("signing");
    const valStroops = BigInt(Math.floor(val * 10000000));
    await processContractCall("withdraw", [
      nativeToScVal(walletAddress, { type: "address" }),
      nativeToScVal(valStroops, { type: "i128" })
    ], "success");
  };

  const handleStakeConfirm = async () => {
    const val = parseFloat(stakeAmount);
    if (!val || val <= 0 || val > realBalance) return;
    setStakeStep("signing");
    const valStroops = BigInt(Math.floor(val * 10000000));
    await processContractCall("stake", [
      nativeToScVal(walletAddress, { type: "address" }),
      nativeToScVal(valStroops, { type: "i128" }),
      nativeToScVal(BigInt(selectedMonths), { type: "u64" })
    ], "success");
  };

  const handleUnstake = async () => {
    setStakeStep("unstaking");
    await processContractCall("unstake", [nativeToScVal(walletAddress, { type: "address" })], "success");
  };

  const selectedOption = STAKING_OPTIONS.find((o) => o.months === selectedMonths)!;
  const stakeVal = parseFloat(stakeAmount) || 0;
  const estimatedReturn = stakeVal + stakeVal * (selectedOption.apy / 100) * (selectedMonths / 12);
  const earnedInterest = onChainStake.amount > 0 ? (onChainStake.amount * (onChainStake.apy / 100) * (onChainStake.months / 12)) : 0;

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
        {/* Balance Card */}
        <div className="card-elevated p-5 flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Saldo disponible</p>
            <p className="text-2xl font-extrabold text-foreground tabular-nums">{realBalance.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">XLM</span></p>
          </div>
          <button onClick={() => setModalOpen(true)} disabled={realBalance <= 0} className="btn-emerald flex items-center gap-2 px-5 py-3 text-sm disabled:opacity-40">
            <ArrowDownToLine className="w-4 h-4" /> Retirar
          </button>
        </div>

        {/* STAKING SECTION */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-foreground">Staking</h2>
          </div>

          <button onClick={() => { setStakeStep("input"); setStakeModalOpen(true); }} className="card-elevated p-5 w-full flex items-center justify-between hover:ring-2 hover:ring-primary/30 active:scale-[0.97] transition-all group mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Generar rendimientos</p>
                <p className="text-xs text-muted-foreground">Bloquea tus fondos y gana intereses</p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-accent opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* ACTIVE POSITION ON CHAIN */}
          {onChainStake.amount > 0 ? (
            <div className="card-elevated divide-y divide-border">
              <div className="px-4 py-3 flex items-center justify-between bg-accent/5 rounded-t-xl">
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Posición Activa</span>
                <span className="text-xs font-bold text-accent">{onChainStake.amount} XLM</span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Bloqueado a {onChainStake.months} mes(es)</p>
                      <p className="text-xs text-muted-foreground">{onChainStake.apy}% APY Generado</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-500">+{earnedInterest.toFixed(2)} XLM</p>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleUnstake}
                  disabled={!canUnstake || stakeStep === "unstaking"}
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    canUnstake ? "bg-accent text-white shadow-md hover:bg-accent/90" : "bg-secondary text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {stakeStep === "unstaking" ? "Procesando..." : canUnstake ? <><Unlock className="w-4 h-4"/> Retirar Inversión</> : <><Clock className="w-4 h-4"/> {timeLeftStr}</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="card-elevated p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs font-bold text-foreground mb-0.5">Sin posiciones de staking</p>
              <p className="text-[10px] text-muted-foreground">Elige un plazo arriba para empezar a generar rendimientos</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* MODAL DE DEPOSITOS/RETIROS (Se mantiene igual que la versión anterior) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={step === "signing" ? undefined : handleClose} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8 animate-slide-up z-10">
            {step !== "signing" && <button onClick={handleClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>}
            
            {step === "input" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">Retirar fondos</h2>
                <div className="mb-4 mt-6">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-3xl font-bold bg-secondary rounded-xl px-4 py-4 outline-none tabular-nums" />
                </div>
                <div className="flex gap-2 mb-6">
                  {[10, 25, 50].map((v) => (
                    <button key={v} onClick={() => setAmount(String(Math.min(v, realBalance)))} className="flex-1 py-2 rounded-lg bg-secondary text-sm font-semibold">{v} XLM</button>
                  ))}
                </div>
                <button onClick={handleWithdraw} disabled={!parseFloat(amount) || parseFloat(amount) > realBalance} className="btn-emerald w-full py-4 font-bold disabled:opacity-50">Confirmar Retiro</button>
              </>
            )}
            
            {step === "signing" && (
              <div className="flex flex-col items-center py-10"><Fingerprint className="w-12 h-12 text-primary animate-pulse mb-4" /><p className="font-bold">Procesando...</p></div>
            )}
            
            {step === "success" && (
              <div className="flex flex-col items-center py-8"><CheckCircle2 className="w-16 h-16 text-primary mb-4" /><p className="font-bold text-xl">Retiro Exitoso</p><button onClick={handleClose} className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-bold">Listo</button></div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE STAKING */}
      {stakeModalOpen && onChainStake.amount === 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={handleStakeClose} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8 animate-slide-up z-10">
            <button onClick={handleStakeClose} className="absolute right-4 top-4 p-2"><X className="w-5 h-5 text-muted-foreground" /></button>

            {stakeStep === "input" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-accent"/> Staking</h2>
                <div className="flex gap-2 mb-5">
                  {STAKING_OPTIONS.map((opt) => (
                    <button key={opt.months} onClick={() => setSelectedMonths(opt.months)} className={`flex-1 py-2.5 rounded-xl text-center transition-all ${selectedMonths === opt.months ? "bg-accent text-white" : "bg-secondary"}`}>
                      <span className="block text-sm font-bold">{opt.label}</span>
                      <span className="block text-[10px] opacity-80">{opt.apy}% APY</span>
                    </button>
                  ))}
                </div>
                <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full text-3xl font-bold bg-secondary rounded-xl px-4 py-4 mb-4" />
                <button onClick={handleStakeConfirm} disabled={stakeVal > realBalance || stakeVal <= 0} className="w-full rounded-xl bg-accent text-white py-4 font-bold">Bloquear Fondos</button>
              </>
            )}

            {(stakeStep === "signing" || stakeStep === "unstaking") && (
              <div className="flex flex-col items-center py-10"><Lock className="w-12 h-12 text-accent animate-pulse mb-4" /><p className="font-bold">Procesando en Soroban...</p></div>
            )}

            {stakeStep === "success" && (
              <div className="flex flex-col items-center py-8"><Sparkles className="w-16 h-16 text-accent mb-4" /><p className="font-bold text-xl">¡Éxito!</p><button onClick={handleStakeClose} className="mt-6 w-full bg-accent text-white py-3 rounded-xl font-bold">Listo</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Retiros;