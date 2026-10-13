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
import ReconciliationDashboard from "./pages/reconciliation/ReconciliationDashboard";
import ImportWizard from "./pages/reconciliation/ImportWizard";
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
                
                {/* Rutas genéricas SalmoTrack v2 */}
                <Route path="/sites" element={<Sedes />} />
                <Route path="/sites/:id" element={<SedeDetalle />} />
                <Route path="/sites/:siteId/zones/:id" element={<GalponDetalle />} />
                <Route path="/zones/:id" element={<GalponDetalle />} />
                <Route path="/locations/:id" element={<GalponDetalle />} />
                <Route path="/movements" element={<Movimientos />} />
                <Route path="/alerts" element={<Alertas />} />
                <Route path="/reports" element={<Reportes />} />
                <Route path="/users" element={<Usuarios />} />
                <Route path="/settings" element={<Stub title="Configuración de Organización" />} />
                <Route path="/reconciliation" element={<ReconciliationDashboard />} />
                <Route path="/reconciliation/import" element={<ImportWizard />} />
                <Route path="/layout" element={<Stub title="Editor de Layout 2D/3D" />} />

                {/* Compatibilidad y redirecciones transparentes */}
                <Route path="/sedes" element={<Navigate to="/sites" replace />} />
                <Route path="/sedes/:id" element={<SedeDetalle />} />
                <Route path="/galpon/:id" element={<GalponDetalle />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/movimientos" element={<Navigate to="/movements" replace />} />
                <Route path="/alertas" element={<Navigate to="/alerts" replace />} />
                <Route path="/gerencia" element={<Gerencia />} />
                <Route path="/reportes" element={<Navigate to="/reports" replace />} />
                <Route path="/usuarios" element={<Navigate to="/users" replace />} />
                <Route path="/config" element={<Navigate to="/settings" replace />} />
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
