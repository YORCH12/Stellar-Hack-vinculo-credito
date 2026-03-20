import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import WalletSetupModal from "@/components/WalletSetupModal";
import Index from "./pages/Index.tsx";
import Historial from "./pages/Historial.tsx";
import Perfil from "./pages/Perfil.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const isOnboarded = () => localStorage.getItem("vinculo_onboarded") === "1";

const WalletGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [needsWallet, setNeedsWallet] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("wallet_address")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setNeedsWallet(!data?.wallet_address);
        setChecked(true);
      });
  }, [user]);

  if (!checked) return null;

  return (
    <>
      {needsWallet && <WalletSetupModal onComplete={() => setNeedsWallet(false)} />}
      {children}
    </>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <WalletGate>{children}</WalletGate>;
};

const RequireOnboarding = ({ children }: { children: React.ReactNode }) =>
  isOnboarded() ? <>{children}</> : <Navigate to="/bienvenida" replace />;

const PublicOnly = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/bienvenida" element={<RequireAuth>{isOnboarded() ? <Navigate to="/" replace /> : <Onboarding />}</RequireAuth>} />
              <Route path="/" element={<RequireAuth><RequireOnboarding><Index /></RequireOnboarding></RequireAuth>} />
              <Route path="/historial" element={<RequireAuth><RequireOnboarding><Historial /></RequireOnboarding></RequireAuth>} />
              <Route path="/perfil" element={<RequireAuth><RequireOnboarding><Perfil /></RequireOnboarding></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
