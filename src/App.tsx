import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index.tsx";
import Historial from "./pages/Historial.tsx";
import Perfil from "./pages/Perfil.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const isOnboarded = () => localStorage.getItem("vinculo_onboarded") === "1";

const RequireOnboarding = ({ children }: { children: React.ReactNode }) =>
  isOnboarded() ? <>{children}</> : <Navigate to="/bienvenida" replace />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/bienvenida" element={isOnboarded() ? <Navigate to="/" replace /> : <Onboarding />} />
            <Route path="/" element={<RequireOnboarding><Index /></RequireOnboarding>} />
            <Route path="/historial" element={<RequireOnboarding><Historial /></RequireOnboarding>} />
            <Route path="/perfil" element={<RequireOnboarding><Perfil /></RequireOnboarding>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
