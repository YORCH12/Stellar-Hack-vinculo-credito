import { X, ExternalLink, Award, CheckCircle2 } from "lucide-react";

interface NFTModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  level: string;
  depositsCount: number;
  totalVolume: number;
  txHash?: string;
}

const NFTModal = ({ open, onClose, walletAddress, level, depositsCount, totalVolume, txHash }: NFTModalProps) => {
  if (!open) return null;

  const truncate = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden animate-fade-up z-10">
        {/* Header glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          {/* NFT Visual */}
          <div className="relative w-48 h-48 mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary shadow-lg" />
            <div className="absolute inset-[3px] rounded-2xl bg-card flex flex-col items-center justify-center gap-2">
              <Award className="w-14 h-14 text-primary" />
              <p className="text-lg font-extrabold text-foreground tracking-tight">Nivel {level}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Vin · Stellar</p>
            </div>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">NFT Acreditado</span>
          </div>

          <h2 className="text-xl font-extrabold text-foreground mb-1">¡Felicidades!</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Tu NFT de reputación ha sido minteado exitosamente en la red Stellar.
          </p>

          {/* Metadata */}
          <div className="w-full bg-secondary rounded-xl p-4 space-y-2.5 text-left mb-5">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Nivel</span>
              <span className="text-xs font-bold text-foreground">{level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Depósitos</span>
              <span className="text-xs font-bold text-foreground">{depositsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Volumen total</span>
              <span className="text-xs font-bold text-foreground">{totalVolume} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Wallet</span>
              <span className="text-xs font-mono font-bold text-foreground">{truncate(walletAddress)}</span>
            </div>
          </div>

          {/* Explorer link */}
          {txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-4"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver en Stellar Explorer
            </a>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold shadow-sm hover:bg-primary/90 active:scale-[0.97] transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFTModal;
