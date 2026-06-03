import { useNavigate } from "react-router-dom";
import { rolLabel, useRole } from "@/context/RoleContext";
import { Wifi, WifiOff, ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = ({ title }: { title?: string }) => {
  const { usuario, online, logout } = useRole();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
      <div>{title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}</div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md ${
            online ? "bg-status-disponible/10 text-status-disponible" : "bg-status-medio/10 text-status-medio"
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "API ONLINE" : "API OFFLINE"}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted text-sm">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {usuario.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="text-left">
              <div className="font-medium leading-tight">{usuario.nombre}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{rolLabel[usuario.rol]}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{rolLabel[usuario.rol]}</DropdownMenuLabel>
            <DropdownMenuItem disabled>{usuario.sede}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" /> Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
