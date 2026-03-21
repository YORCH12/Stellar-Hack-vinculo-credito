import { useState, useEffect, useCallback } from "react";
import { isConnected, requestAccess } from "@stellar/freighter-api";
import { fetchContractBalance } from "../stellar/queries"; 
import { Wallet, RefreshCw } from "lucide-react";

const BalanceCard = () => {
  const [realBalance, setRealBalance] = useState<number | string>("...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Le agregamos un parámetro "silent" para que no gire el ícono cuando lo hace automático
  const loadBalance = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    
    console.log("🔍 1. Consultando saldo...");
    try {
      if (await isConnected()) {
        const access = await requestAccess();
        if (access.address) {
          console.log("✅ 2. Billetera detectada:", access.address);
          
          // Llamamos a la blockchain
          const balance = await fetchContractBalance(access.address);
          console.log("💰 3. Saldo devuelto por Soroban:", balance);
          
          setRealBalance(balance);
        } else {
          console.warn("⚠️ Billetera conectada pero no devolvió dirección");
        }
      } else {
        console.warn("⚠️ Freighter NO está conectado");
      }
    } catch (error) {
      console.error("❌ Error en la ruta del saldo:", error);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Carga inicial inmediata (hace girar el ícono)
    loadBalance(false);

    // 2. MAGIA DE TIEMPO REAL: Pregunta a la red cada 5 segundos (silenciosamente)
    const intervalId = setInterval(() => {
      loadBalance(true); 
    }, 5000); // 5000 ms = 5 segundos

    // 3. Limpieza: Si el usuario cambia de página, apagamos el temporizador
    return () => clearInterval(intervalId);
  }, [loadBalance]);

  return (
    <div className="bg-primary rounded-2xl p-6 text-primary-foreground shadow-lg w-full relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 opacity-80" />
          <span className="text-sm font-semibold tracking-wider opacity-90">MI AHORRO</span>
        </div>
        
        {/* Botón manual por si el usuario es impaciente */}
        <button 
          onClick={() => loadBalance(false)} 
          disabled={isRefreshing}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
          title="Actualizar saldo"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-5xl font-extrabold tracking-tight tabular-nums transition-all duration-500">
          {realBalance}
        </span>
        <span className="text-xl font-medium opacity-80">XLM</span>
      </div>

      <p className="text-primary-foreground/70 text-sm mt-2 relative z-10">
        Saldo disponible en contrato
      </p>
    </div>
  );
};

export default BalanceCard;