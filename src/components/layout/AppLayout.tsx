import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OfflineBanner } from "@/components/OfflineBanner";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sedes": "Vista Global de Sedes",
  "/movimientos": "Movimientos",
  "/alertas": "Alertas",
  "/reportes": "Reportes",
  "/inventario": "Inventario 3D",
  "/usuarios": "Usuarios",
  "/gerencia": "Panel Gerencial",
  "/config": "Configuracion",
};

export const AppLayout = () => {
  const { pathname } = useLocation();

  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <OfflineBanner />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
