import { useMemo, useState } from "react";
import { Box, ArrowDownToLine, ArrowUpFromLine, RefreshCw, QrCode, Wifi, WifiOff, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MovimientoForm } from "@/components/MovimientoForm";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

export default function Operario() {
  const { usuario, online, logout } = useRole();
  const inventoryQuery = useInventorySnapshot();
  const [openMov, setOpenMov] = useState(false);
  const navigate = useNavigate();

  const items = useMemo(
    () => (inventoryQuery.data?.containers ?? []).slice(0, 6),
    [inventoryQuery.data?.containers],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-white/15 flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs opacity-80">Axious · Operario</div>
              <div className="font-semibold leading-tight">{usuario.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded ${
                online ? "bg-status-disponible text-white" : "bg-status-medio text-white"
              }`}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "ONLINE" : "OFFLINE"}
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="p-1.5 rounded hover:bg-white/15"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-12 text-base" placeholder="Buscar container o producto" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={ArrowDownToLine} label="Registrar Entrada" onClick={() => setOpenMov(true)} color="bg-status-disponible" />
          <ActionButton icon={ArrowUpFromLine} label="Registrar Salida" onClick={() => setOpenMov(true)} color="bg-secondary" />
          <ActionButton icon={RefreshCw} label="Traslado" onClick={() => setOpenMov(true)} color="bg-primary" />
          <ActionButton icon={QrCode} label="Escanear QR" onClick={() => {}} color="bg-status-cuarentena" />
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2 px-1">Containers visibles</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.codigo} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold">{item.codigo}</div>
                  <div className="text-xs text-muted-foreground">{item.producto ?? item.tipoProductoPermitido}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm font-semibold">{item.ocupacion}%</div>
                  <StatusBadge estado={item.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <div className="text-sm font-semibold text-secondary">Registro de movimientos en linea</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Esta vista ya usa la misma API local que el resto del sistema.
          </div>
        </div>
      </main>

      <MovimientoForm open={openMov} onOpenChange={setOpenMov} availableContainers={items} />
    </div>
  );
}

const ActionButton = ({ icon: Icon, label, onClick, color }: { icon: typeof Box; label: string; onClick: () => void; color: string }) => (
  <button onClick={onClick} className={`${color} text-white rounded-lg p-5 flex flex-col items-center justify-center gap-2 h-28 active:scale-95 transition shadow-sm`}>
    <Icon className="h-7 w-7" />
    <span className="text-sm font-semibold text-center leading-tight">{label}</span>
  </button>
);
