import { SensitiveText } from "@/privacy/EvidenceMode";
import { NavLink } from "react-router-dom";
import {
  Box,
  LayoutDashboard,
  Map,
  Boxes,
  ClipboardList,
  Bell,
  BarChart3,
  Users,
  Layers,
  Smartphone,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { visibleNavItems } from "@/lib/navigation";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  module?: string;
  roles?: string[];
  badge?: string;
}

const items: NavItem[] = [
  { to: "/operario", label: "Operaciones", icon: Smartphone, roles: ["operario"] },
  { to: "/sites", label: "Lugares", icon: Map },
  { to: "/movements", label: "Movimientos", icon: ClipboardList },
  { to: "/reconciliation", label: "Conciliación ERP", icon: Layers, module: "importacion" },
  { to: "/layout", label: "Editor Layout", icon: Boxes, permission: "sitio:write" },
  { to: "/alerts", label: "Alertas", icon: Bell },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  // El backend responde 403 a /api/v2/dashboard/* sin este permiso.
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { to: "/users", label: "Usuarios", icon: Users, permission: "rbac:manage" },
];

export const Sidebar = ({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) => {
  const { usuario, can, hasModule } = useRole();

  const visible = visibleNavItems(items, { rol: usuario.rol, can, hasModule });

  return (
    <aside className={`w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 ${className}`}>
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary flex items-center justify-center">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight">SalmoTrack v2</div>
            <div className="text-[11px] text-sidebar-foreground/70 truncate max-w-[150px]">
              <SensitiveText category="Empresa" value={usuario.organizacion_nombre ?? "Plataforma Visual"} />
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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
      <div className="px-4 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/90 flex items-center justify-between">
        <span>v2.0.0</span>
        <span className="text-[10px] uppercase tracking-wider bg-sidebar-accent px-1.5 py-0.5 rounded">
          {usuario.rol}
        </span>
      </div>
    </aside>
  );
};
