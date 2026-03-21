import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Wallet, Star, ChevronRight, LogOut, HelpCircle, Bell, Pencil, Loader2, Award, Lock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WalletSetupModal from "@/components/WalletSetupModal";
import NFTModal from "@/components/NFTModal"; // 🚀 Importamos el Modal del NFT
import logoVin from "@/assets/logo-vin.png";

const Perfil = () => {
  const navigate = useNavigate();
  // 🚀 Obtenemos 'deposits' del contexto para las matemáticas
  const { balance, depositsCount, creditWithdrawn, deposits } = useApp();
  const { user, signOut } = useAuth();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // 🚀 ESTADOS PARA EL NFT Y EL MODAL
  const [isMinting, setIsMinting] = useState(false);
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [nftTxHash, setNftTxHash] = useState<string | undefined>();

  // 🚀 ESTADO DEL MOTOR DE RIESGO
  const [riskData, setRiskData] = useState({ 
    score: 0, 
    tier: 0, 
    tierName: "Bronce" 
  });

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuario";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // EL EFECTO: Sincroniza el perfil con las matemáticas de Node.js
  useEffect(() => {
    const fetchRiskScore = async () => {
      if (deposits.length === 0) return;
      try {
        const response = await fetch("http://localhost:3000/api/calculate-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: "SIMULACION", deposits })
        });
        const data = await response.json();
        if (data.score !== undefined) setRiskData(data);
      } catch (error) {
        console.error("Error sincronizando matemáticas:", error);
      }
    };
    fetchRiskScore();
  }, [deposits]);

  // Lógica de progreso sincronizada
  let nextThreshold = 50; 
  if (riskData.score >= 50) nextThreshold = 150;
  if (riskData.score >= 150) nextThreshold = 500;
  if (riskData.score >= 500) nextThreshold = 1000;
  if (riskData.score >= 1000) nextThreshold = riskData.score;

  const visualPercentage = Math.min(100, Math.floor((riskData.score / nextThreshold) * 100));
  
  // REGLA DE NEGOCIO: Nivel 1 (Plata) o superior para desbloquear
  const isUnlocked = riskData.tier >= 1; 

  const handleClaimNFT = async () => {
    if (!walletAddress) {
      alert("Por favor, conecta tu wallet primero.");
      return;
    }

    setIsMinting(true);
    try {
      const response = await fetch("http://localhost:3000/api/evaluate-and-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: walletAddress, 
          deposits: deposits 
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "minted") {
        // 🚀 Si es exitoso, abrimos el modal pasándole el hash de Soroban
        setNftTxHash(data.txHash);
        setShowNFTModal(true);
      } else {
        alert(data.message || data.error || "Error al procesar el NFT");
      }
    } catch (error) {
      console.error("Error pidiendo el NFT:", error);
      alert("Hubo un error de conexión con el servidor.");
    } finally {
      setIsMinting(false);
    }
  };

  const fetchWallet = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setWalletAddress(data?.wallet_address ?? null);
        setLoadingProfile(false);
      });
  };

  useEffect(() => { fetchWallet(); }, [user]);

  const truncateAddress = (addr: string) => addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const menuItems = [
    { icon: Bell, label: "Notificaciones", detail: "Activadas", action: () => navigate("/notificaciones") },
    { icon: HelpCircle, label: "Centro de ayuda", detail: "", action: () => navigate("/ayuda") },
    { icon: LogOut, label: "Cerrar sesión", detail: "", destructive: true, action: signOut },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center gap-3">
        <img src={logoVin} alt="Vin" className="w-7 h-7 object-contain" />
        <h1 className="text-xl font-bold text-foreground tracking-tight">Perfil</h1>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-4">
        {/* Avatar + Info */}
        <div className="card-elevated p-6 flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary-foreground">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        {/* Stats Rápidas */}
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
            {/* El nivel ahora viene directo de las mates de Node */}
            <p className="text-lg font-bold text-foreground">{riskData.tierName}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Nivel</p>
          </div>
        </div>

        {/* Card de Reputación */}
        <div className={`card-elevated p-5 border-2 opacity-0 animate-fade-up ${isUnlocked ? "border-primary/20" : "border-transparent"}`} style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className={`w-4 h-4 ${isUnlocked ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Estado de Reputación</span>
          </div>
          
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2 relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isUnlocked ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ width: `${visualPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
            {isUnlocked ? (
              <span className="text-primary font-semibold">✓ Desbloqueado</span>
            ) : (
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" /> Bloqueado (Bronce)
              </span>
            )}
            <span className="font-semibold">{visualPercentage}%</span>
          </div>

          {/* Botón dinámico */}
          {isUnlocked ? (
            <button
              onClick={handleClaimNFT}
              disabled={isMinting || !walletAddress}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {isMinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
              {isMinting ? "Minteando SBT en Soroban..." : "Reclamar NFT de Nivel"}
            </button>
          ) : (
             <div className="w-full mt-2 rounded-xl bg-secondary py-3 px-2 text-sm font-semibold text-muted-foreground text-center">
               Sigue simulando tiempo para mejorar tu nivel y desbloquear beneficios 🚀
             </div>
          )}

          {creditWithdrawn && (
            <div className="mt-4 bg-primary/10 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary">Crédito retirado exitosamente ✅</p>
            </div>
          )}
        </div>
        
        {/* Wallet info */}
        <div className="card-elevated p-5 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Wallet Conectada</span>
            </div>
            <button onClick={() => setShowWalletModal(true)} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              <Pencil className="w-3 h-3" />
              {walletAddress ? "Editar" : "Agregar"}
            </button>
          </div>
          {loadingProfile ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : walletAddress ? (
            <div className="bg-secondary rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Dirección</p>
              <p className="text-sm font-mono font-medium text-foreground truncate">{truncateAddress(walletAddress)}</p>
            </div>
          ) : (
            <button onClick={() => setShowWalletModal(true)} className="w-full bg-secondary rounded-xl px-4 py-4 text-center hover:bg-secondary/80 transition-colors">
              <p className="text-sm text-muted-foreground">Sin wallet conectada</p>
              <p className="text-xs text-primary font-semibold mt-1">Toca para agregar</p>
            </button>
          )}
        </div>

        {/* Menú de Usuario */}
        <div className="card-elevated divide-y divide-border opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          {menuItems.map(({ icon: Icon, label, detail, destructive, action }) => (
            <button key={label} onClick={action} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-secondary/50 transition-colors">
              <Icon className={`w-4.5 h-4.5 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
              <span className={`flex-1 text-left text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
              {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-2 pb-4">Vyn v1.0 · Stellar Network</p>
      </main>

      {/* MODALES */}
      {showWalletModal && <WalletSetupModal onComplete={() => { setShowWalletModal(false); fetchWallet(); }} />}
      
      <NFTModal
        open={showNFTModal}
        onClose={() => setShowNFTModal(false)}
        walletAddress={walletAddress || ""}
        level={riskData.tierName} // Le pasamos el nombre real (Plata, Oro, etc)
        depositsCount={depositsCount}
        totalVolume={balance}
        txHash={nftTxHash}
      />

      <BottomNav />
    </div>
  );
};

export default Perfil;