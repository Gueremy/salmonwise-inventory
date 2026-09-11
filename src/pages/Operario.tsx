import { useCallback, useMemo, useState } from "react";
import { Box, ArrowDownToLine, ArrowUpFromLine, RefreshCw, QrCode, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MovimientoForm } from "@/components/MovimientoForm";
import { OfflineBanner } from "@/components/OfflineBanner";
import { QrScanner } from "@/components/QrScanner";
import { SyncStatus } from "@/components/SyncStatus";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";
import type { InventoryContainerView } from "@/lib/inventory";

type MovementType = "entrada_proveedor" | "salida_produccion" | "traslado_interno";

export default function Operario() {
  const { usuario, logout } = useRole();
  const inventoryQuery = useInventorySnapshot();
  const [openMov, setOpenMov] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>("entrada_proveedor");
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<InventoryContainerView | undefined>();
  const navigate = useNavigate();

  const allItems = useMemo(() => inventoryQuery.data?.containers ?? [], [inventoryQuery.data?.containers]);
  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems
      .filter((item) => !term || item.codigo.toLowerCase().includes(term) || item.producto?.toLowerCase().includes(term))
      .slice(0, 10);
  }, [allItems, search]);
  const canCreateMovements = allItems.length > 0;

  const openMovementForm = (type: MovementType) => {
    if (!canCreateMovements) return;
    setSelectedContainer(undefined);
    setMovementType(type);
    setOpenMov(true);
  };

  const handleQrScan = useCallback(({ id, info }: { id: string; info: { codigo: string } }) => {
    const match = (inventoryQuery.data?.containers ?? []).find((item) => item.id === id || item.codigo === info.codigo);
    if (!match) {
      toast.error("El container no esta disponible para este usuario.");
      setScanning(false);
      return;
    }
    setSelectedContainer(match);
    setScanning(false);
    setMovementType("entrada_proveedor");
    setOpenMov(true);
  }, [inventoryQuery.data?.containers]);

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
            <div className="rounded-md bg-white px-2 py-1"><SyncStatus /></div>
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
      <OfflineBanner />

      <main className="p-4 space-y-5 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-12 text-base" placeholder="Buscar container o producto" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={ArrowDownToLine} label="Registrar Entrada" onClick={() => openMovementForm("entrada_proveedor")} color="bg-status-disponible" disabled={!canCreateMovements} />
          <ActionButton icon={ArrowUpFromLine} label="Registrar Salida" onClick={() => openMovementForm("salida_produccion")} color="bg-secondary" disabled={!canCreateMovements} />
          <ActionButton icon={RefreshCw} label="Traslado" onClick={() => openMovementForm("traslado_interno")} color="bg-primary" disabled={!canCreateMovements} />
          <ActionButton icon={QrCode} label="Escanear QR" onClick={() => setScanning(true)} color="bg-status-cuarentena" />
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
            {!inventoryQuery.isLoading && items.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No hay containers que coincidan.</div>
            )}
          </div>
        </div>

        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <div className="text-sm font-semibold text-secondary">Registro resiliente de movimientos</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {inventoryQuery.isError
              ? "La API no esta disponible para registrar movimientos en este momento."
              : "Con internet se envia al servidor; sin internet queda pendiente en este dispositivo."}
          </div>
        </div>
      </main>

      <MovimientoForm
        open={openMov}
        onOpenChange={(value) => {
          setOpenMov(value);
          if (!value) setSelectedContainer(undefined);
        }}
        container={selectedContainer}
        availableContainers={allItems}
        initialTipo={movementType}
      />
      {scanning && <QrScanner onScan={handleQrScan} onClose={() => setScanning(false)} />}
    </div>
  );
}

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  color,
  disabled = false,
}: {
  icon: typeof Box;
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white rounded-lg p-5 flex flex-col items-center justify-center gap-2 h-28 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 enabled:active:scale-95`}
  >
    <Icon className="h-7 w-7" />
    <span className="text-sm font-semibold text-center leading-tight">{label}</span>
  </button>
);
