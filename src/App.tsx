import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sedes from "./pages/Sedes";
import SedeDetalle from "./pages/SedeDetalle";
import GalponDetalle from "./pages/GalponDetalle";
import Movimientos from "./pages/Movimientos";
import Alertas from "./pages/Alertas";
import Operario from "./pages/Operario";
import Gerencia from "./pages/Gerencia";
import Inventario from "./pages/Inventario";
import Usuarios from "./pages/Usuarios";
import Reportes from "./pages/Reportes";
import Stub from "./pages/Stub";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { authenticated, authReady } = useRole();

  if (!authReady) {
    return null;
  }

  return authenticated ? <Outlet /> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/operario" element={<Operario />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sedes" element={<Sedes />} />
                <Route path="/sedes/:id" element={<SedeDetalle />} />
                <Route path="/galpon/:id" element={<GalponDetalle />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/movimientos" element={<Movimientos />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/gerencia" element={<Gerencia />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/config" element={<Stub title="Configuracion" />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
