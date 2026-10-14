import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { rolLabel, useRole } from "@/context/RoleContext";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { OfflineStatusIndicator } from "@/components/OfflineStatusIndicator";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-card border-b border-border px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger className="md:hidden rounded-md p-2 hover:bg-muted" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar className="w-full h-full" onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        {title && <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <OfflineStatusIndicator />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted text-sm">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {usuario.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-medium leading-tight">{usuario.nombre}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{rolLabel[usuario.rol]}</div>
            </div>
            <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
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
