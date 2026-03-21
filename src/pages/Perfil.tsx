import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Wallet, Star, ChevronRight, LogOut, HelpCircle, Bell, Pencil, Loader2, Award } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WalletSetupModal from "@/components/WalletSetupModal";
import NFTModal from "@/components/NFTModal";
import logoVin from "@/assets/logo-vin.png";

const Perfil = () => {
  const navigate = useNavigate();
  const { balance, depositsCount, requiredDeposits, isUnlocked, creditWithdrawn } = useApp();
  const { user, signOut } = useAuth();
  const level = isUnlocked ? "Plata" : "Bronce";

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // NUEVO ESTADO: Para controlar el botón mientras Node.js mintea el NFT
  const [isMinting, setIsMinting] = useState(false);
  const [showNFTModal, setShowNFTModal] = useState(false);
  const [nftTxHash, setNftTxHash] = useState<string | undefined>();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuario";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // FUNCIÓN ACTUALIZADA CON LOADING STATE
  const handleClaimNFT = async () => {
    if (!walletAddress) {
      alert("Por favor, conecta tu wallet primero para poder recibir el NFT.");
      return;
    }

    setIsMinting(true);
    try {
      const response = await fetch("http://localhost:3000/api/evaluate-and-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: walletAddress, 
          depositsCount: depositsCount, 
          totalVolume: balance 
        })
      });
      
      const data = await response.json();
      if (data.status === "minted") {
        setNftTxHash(data.txHash);
        setShowNFTModal(true);
      } else {
        alert(data.message);
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

  const truncateAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

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
        {/* Avatar + Name */}
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
          className={`card-elevated p-5 border-2 opacity-0 animate-fade-up ${isUnlocked ? "border-primary/20" : "border-transparent"}`}
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
          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            
            <span className={isUnlocked ? "text-primary font-semibold" : ""}>{isUnlocked ? "✓ Desbloqueado" : "En progreso"}</span>
          </div>

          {/* NUEVO: BOTÓN DE RECLAMAR NFT */}
          {isUnlocked && (
            <button
              onClick={handleClaimNFT}
              disabled={isMinting || !walletAddress}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {isMinting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Award className="w-5 h-5" />
              )}
              {isMinting ? "Generando NFT en Stellar..." : "Reclamar NFT de Nivel"}
            </button>
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
            <button
              onClick={() => setShowWalletModal(true)}
              className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline active:scale-[0.97]"
            >
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
            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full bg-secondary rounded-xl px-4 py-4 text-center hover:bg-secondary/80 transition-colors active:scale-[0.98]"
            >
              <p className="text-sm text-muted-foreground">Sin wallet conectada</p>
              <p className="text-xs text-primary font-semibold mt-1">Toca para agregar</p>
            </button>
          )}
        </div>

        {/* Menu */}
        <div className="card-elevated divide-y divide-border opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          {menuItems.map(({ icon: Icon, label, detail, destructive, action }) => (
            <button
              key={label}
              onClick={action}
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

        <p className="text-center text-[10px] text-muted-foreground pt-2 pb-4">Vin v1.0 · Stellar Network</p>
      </main>

      {showWalletModal && (
        <WalletSetupModal
          onComplete={() => {
            setShowWalletModal(false);
            fetchWallet();
          }}
        />
      )}

      <NFTModal
        open={showNFTModal}
        onClose={() => setShowNFTModal(false)}
        walletAddress={walletAddress || ""}
        level={level}
        depositsCount={depositsCount}
        totalVolume={balance}
        txHash={nftTxHash}
      />

      <BottomNav />
    </div>
  );
};

export default Perfil;