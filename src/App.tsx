import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleProvider } from '@/context/RoleContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PrivateRoute } from '@/components/PrivateRoute';

import Login from './pages/Login';

const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Sedes           = lazy(() => import('./pages/Sedes'));
const SedeDetalle     = lazy(() => import('./pages/SedeDetalle'));
const GalponDetalle   = lazy(() => import('./pages/GalponDetalle'));
const Movimientos     = lazy(() => import('./pages/Movimientos'));
const Alertas         = lazy(() => import('./pages/Alertas'));
const Operario        = lazy(() => import('./pages/Operario'));
const Gerencia        = lazy(() => import('./pages/Gerencia'));
const Inventario      = lazy(() => import('./pages/Inventario'));
const Usuarios        = lazy(() => import('./pages/Usuarios'));
const Configuracion   = lazy(() => import('./pages/Configuracion'));
const Stub            = lazy(() => import('./pages/Stub'));
const NotFound        = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
queryClient.setQueryDefaults(['sedes'],      { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(['galpones'],   { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(['containers'], { staleTime: 30_000 });
queryClient.setQueryDefaults(['alertas'],    { staleTime: 10_000 });
queryClient.setQueryDefaults(['movimientos'],{ staleTime: 30_000 });

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-3 gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Login />} />

              {/* Vista operario */}
              <Route element={<PrivateRoute roles={['operario', 'super_admin']} />}>
                <Route path="/operario" element={<Operario />} />
              </Route>

              {/* App principal */}
              <Route element={<PrivateRoute roles={['super_admin', 'admin_sede', 'jefe_bodega', 'gerencia']} />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard"   element={<Dashboard />} />
                  <Route path="/sedes"       element={<Sedes />} />
                  <Route path="/sedes/:id"   element={<SedeDetalle />} />
                  <Route path="/sedes/:sedeId/galpones/:id" element={<GalponDetalle />} />
                  <Route path="/galpon/:id"  element={<GalponDetalle />} />
                  <Route path="/inventario"  element={<Inventario />} />
                  <Route path="/movimientos" element={<Movimientos />} />
                  <Route path="/alertas"     element={<Alertas />} />
                  <Route path="/gerencia"    element={<Gerencia />} />
                  <Route path="/reportes"    element={<Stub title="Reportes" />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                  <Route path="/config"      element={<Configuracion />} />

                  {/* Solo admin_sede y super_admin */}
                  <Route element={<PrivateRoute roles={['super_admin', 'admin_sede']} />}>
                    <Route path="/usuarios" element={<Usuarios />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
