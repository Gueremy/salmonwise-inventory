import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, type Rol } from "@/context/RoleContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrivateRoute } from "@/components/PrivateRoute";
import { useWebSocket } from "@/hooks/useWebSocket";

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
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const OPERATIONAL_ROLES: Rol[] = ["super_admin", "admin_sede", "jefe_bodega"];
const REPORT_ROLES: Rol[] = ["super_admin", "admin_sede", "jefe_bodega", "gerencia"];
const CONFIG_ROLES: Rol[] = ["super_admin", "admin_sede", "jefe_bodega", "gerencia"];

const RealtimeBridge = () => {
  useWebSocket();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <RealtimeBridge />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route element={<PrivateRoute roles={["operario"]} />}>
                <Route path="/operario" element={<Operario />} />
              </Route>
              <Route element={<AppLayout />}>
                <Route element={<PrivateRoute roles={OPERATIONAL_ROLES} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sedes" element={<Sedes />} />
                  <Route path="/sedes/:id" element={<SedeDetalle />} />
                  <Route path="/galpon/:id" element={<GalponDetalle />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/movimientos" element={<Movimientos />} />
                  <Route path="/alertas" element={<Alertas />} />
                </Route>
                <Route element={<PrivateRoute roles={["gerencia"]} />}>
                  <Route path="/gerencia" element={<Gerencia />} />
                </Route>
                <Route element={<PrivateRoute roles={REPORT_ROLES} />}>
                  <Route path="/reportes" element={<Reportes />} />
                </Route>
                <Route element={<PrivateRoute roles={["super_admin", "admin_sede"]} />}>
                  <Route path="/usuarios" element={<Usuarios />} />
                </Route>
                <Route element={<PrivateRoute roles={CONFIG_ROLES} />}>
                  <Route path="/config" element={<Configuracion />} />
                </Route>
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
