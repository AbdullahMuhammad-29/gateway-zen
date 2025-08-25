import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import MerchantAuth from "./pages/MerchantAuth";
import AdminAuth from "./pages/AdminAuth";
import MerchantDashboard from "./pages/MerchantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DemoCheckout from "./pages/DemoCheckout";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/merchant-auth" element={<MerchantAuth />} />
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/merchant-dashboard" element={<MerchantDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/checkout/:sessionId" element={<DemoCheckout />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
