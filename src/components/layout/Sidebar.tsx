import { NavLink, useLocation } from "react-router-dom";
import { Box, LayoutDashboard, Map, Boxes, ClipboardList, Bell, BarChart3, Users, Settings } from "lucide-react";
import { useRole } from "@/context/RoleContext";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sedes", label: "Vista Global", icon: Map },
  { to: "/inventario", label: "Inventario 3D", icon: Boxes },
  { to: "/movimientos", label: "Movimientos", icon: ClipboardList },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin_sede", "super_admin"] },
  { to: "/config", label: "Configuración", icon: Settings },
];

export const Sidebar = () => {
  const { usuario } = useRole();
  const visible = items.filter((i) => !i.roles || i.roles.includes(usuario.rol));
  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight">Axious</div>
            <div className="text-[11px] text-sidebar-foreground/70">Skretting Los Lagos</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/85"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
            {item.badge && (
              <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
        v0.1 · Prototipo
      </div>
    </aside>
  );
};
