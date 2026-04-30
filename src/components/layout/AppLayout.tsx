import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useRole } from "@/context/RoleContext";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sedes": "Vista Global de Sedes",
  "/movimientos": "Movimientos",
  "/alertas": "Alertas",
  "/reportes": "Reportes",
  "/inventario": "Inventario 3D",
};

export const AppLayout = () => {
  const { usuario } = useRole();
  const { pathname } = useLocation();

  // Operario tiene su propia vista mobile
  if (usuario.rol === "operario" && !pathname.startsWith("/operario")) {
    return <Navigate to="/operario" replace />;
  }

  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
