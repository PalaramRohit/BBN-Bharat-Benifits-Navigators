import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AssistedDashboard from "./pages/AssistedDashboard";

const queryClient = new QueryClient();

import { BBNProvider, useBBN } from "./context/BBNContext";

const ModeAwareRoutes = () => {
  const { isAssistedMode } = useBBN();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAssistedMode && location.pathname !== "/assisted-dashboard") {
      navigate("/assisted-dashboard", { replace: true });
    } else if (!isAssistedMode && location.pathname === "/assisted-dashboard") {
      navigate("/", { replace: true });
    }
  }, [isAssistedMode, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/assisted-dashboard" element={<AssistedDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BBNProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ModeAwareRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </BBNProvider>
  </QueryClientProvider>
);

export default App;
