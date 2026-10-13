import { useMemo, useState } from "react";
import { Box, ArrowDownToLine, ArrowUpFromLine, RefreshCw, QrCode, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MovimientoForm } from "@/components/MovimientoForm";
import { QrScannerModal } from "@/components/qr/QrScannerModal";
import { OfflineStatusIndicator } from "@/components/OfflineStatusIndicator";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";
import { toast } from "sonner";

type MovementType = "entrada_proveedor" | "salida_produccion" | "traslado_interno";

export default function Operario() {
  const { usuario, logout } = useRole();
  const inventoryQuery = useInventorySnapshot();
  const [openMov, setOpenMov] = useState(false);
  const [openQr, setOpenQr] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>("entrada_proveedor");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const allContainers = useMemo(() => inventoryQuery.data?.containers ?? [], [inventoryQuery.data?.containers]);

  const items = useMemo(() => {
    if (!searchTerm.trim()) {
      return allContainers.slice(0, 8);
    }
    const q = searchTerm.toLowerCase();
    return allContainers.filter(
      (c) => c.codigo.toLowerCase().includes(q) || (c.producto && c.producto.toLowerCase().includes(q)),
    );
  }, [allContainers, searchTerm]);

  const canCreateMovements = !inventoryQuery.isLoading && !inventoryQuery.isError && allContainers.length > 0;

  const openMovementForm = (type: MovementType) => {
    if (!canCreateMovements) return;
    setMovementType(type);
    setOpenMov(true);
  };

  const handleQrScanned = (code: string) => {
    setSearchTerm(code);
    const matched = allContainers.find((c) => c.codigo.toLowerCase() === code.toLowerCase());
    if (matched) {
      toast.success(`Ubicación encontrada: ${matched.codigo}`);
    } else {
      toast.info(`Búsqueda aplicada para código: ${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-white/15 flex items-center justify-center">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs opacity-80">SalmoTrack v2 · Operador</div>
              <div className="font-semibold leading-tight">{usuario.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OfflineStatusIndicator />
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="p-1.5 rounded hover:bg-white/15 ml-1"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-12 text-base"
            placeholder="Buscar ubicación o ítem..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            icon={ArrowDownToLine}
            label="Registrar Entrada"
            onClick={() => openMovementForm("entrada_proveedor")}
            color="bg-status-disponible"
            disabled={!canCreateMovements}
          />
          <ActionButton
            icon={ArrowUpFromLine}
            label="Registrar Salida"
            onClick={() => openMovementForm("salida_produccion")}
            color="bg-secondary"
            disabled={!canCreateMovements}
          />
          <ActionButton
            icon={RefreshCw}
            label="Traslado"
            onClick={() => openMovementForm("traslado_interno")}
            color="bg-primary"
            disabled={!canCreateMovements}
          />
          <ActionButton
            icon={QrCode}
            label="Escanear QR"
            onClick={() => setOpenQr(true)}
            color="bg-status-cuarentena"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-semibold text-sm">Ubicaciones disponibles</h3>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs text-primary hover:underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.codigo}
                className="bg-card rounded-lg border border-border p-4 flex items-center justify-between shadow-sm"
              >
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
            {items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No se encontraron ubicaciones que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-secondary text-sm">Operación con o sin conexión</div>
          <p>
            Los movimientos registrados en modo offline se almacenarán en tu dispositivo y se enviarán al servidor automáticamente al restablecerse la red.
          </p>
        </div>
      </main>

      {openMov && (
        <MovimientoForm
          open={openMov}
          onOpenChange={setOpenMov}
          availableContainers={allContainers}
          initialTipo={movementType}
        />
      )}

      {openQr && (
        <QrScannerModal
          open={openQr}
          onOpenChange={setOpenQr}
          onCodeScanned={handleQrScanned}
        />
      )}
    </div>
  );
}

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  color,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-4 rounded-xl text-white font-semibold flex flex-col items-center justify-center gap-2 transition hover:opacity-95 active:scale-98 disabled:opacity-50 shadow-sm ${color}`}
  >
    <Icon className="h-6 w-6" />
    <span className="text-xs text-center">{label}</span>
  </button>
);
