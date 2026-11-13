import { lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import LocationRoute from "./pages/LocationRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "./pages/Login";
import Sedes from "./pages/Sedes";
import SedeDetalle from "./pages/SedeDetalle";
import GalponDetalle from "./pages/GalponDetalle";
import Movimientos from "./pages/Movimientos";
import Alertas from "./pages/Alertas";
import Operario from "./pages/Operario";
import Inventario from "./pages/Inventario";
import NotFound from "./pages/NotFound";
import { EvidenceModeControl } from "@/privacy/EvidenceMode";
import { PwaUpdateNotice } from "@/components/PwaUpdateNotice";
import { canOpenRoute, OPERARIO_HOME } from "@/lib/navigation";

// Pantallas de uso ocasional o con dependencias pesadas (gráficos): se descargan al abrirlas.
// El Service Worker las precarga igual, así que siguen disponibles sin conexión.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Gerencia = lazy(() => import("./pages/Gerencia"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Reportes = lazy(() => import("./pages/Reportes"));
const ReconciliationDashboard = lazy(() => import("./pages/reconciliation/ReconciliationDashboard"));
const ImportWizard = lazy(() => import("./pages/reconciliation/ImportWizard"));
const LayoutEditor = lazy(() => import("./pages/layout/LayoutEditor"));

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const location = useLocation();
  const { authenticated, authReady, usuario, can, hasModule } = useRole();

  if (!authReady) {
    return null;
  }

  if (!authenticated) return <Navigate to="/" state={{ from: location.pathname + location.search }} replace />;
  if (!canOpenRoute(location.pathname, { rol: usuario.rol, can, hasModule })) {
    return usuario.rol === "operario" ? <Navigate to={OPERARIO_HOME} replace /> :
      <div role="alert" className="p-6">No tienes permiso para abrir esta página.</div>;
  }
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <EvidenceModeControl />
        <PwaUpdateNotice />
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
                <Route path="/locations/:id" element={<LocationRoute />} />
                <Route path="/movements" element={<Movimientos />} />
                <Route path="/alerts" element={<Alertas />} />
                <Route path="/reports" element={<Reportes />} />
                <Route path="/users" element={<Usuarios />} />
                <Route path="/reconciliation" element={<ReconciliationDashboard />} />
                <Route path="/reconciliation/import" element={<ImportWizard />} />
                <Route path="/layout" element={<LayoutEditor />} />

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
