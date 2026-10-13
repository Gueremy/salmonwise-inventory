import { useState } from "react";
import { Package, X, ArrowDownToLine, ArrowUpFromLine, RefreshCw, AlertCircle, Info, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useRole } from "@/context/RoleContext";
import { resolveLocationVisualState } from "@/domain/location";
import { MovimientoForm } from "@/components/MovimientoForm";

export interface DrawerLocation {
  id?: string;
  codigo?: string;
  nombre?: string;
  estado?: string;
  ocupacion_actual?: number;
  ocupacionActual?: number;
  capacidad_maxima?: number;
  capacidadMax?: number;
  unidad_capacidad?: string;
  unidadMedida?: string;
  item_nombre?: string;
  producto?: string;
  lote_principal?: string;
  lote?: string;
  temperatura_actual?: number | null;
  temperatura?: number | null;
  fecha_vencimiento?: string | null;
  fechaVencimiento?: string | null;
  atributos?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Props {
  location: DrawerLocation | null;
  onClose: () => void;
  zoneName?: string;
  onRefresh?: () => void;
}

export const LocationDetailDrawer = ({ location, onClose, zoneName, onRefresh }: Props) => {
  const { organizacion, can } = useRole();
  const [openMovement, setOpenMovement] = useState(false);
  const [movementInitialType, setMovementInitialType] = useState<"entrada_proveedor" | "salida_produccion" | "traslado_interno">("entrada_proveedor");

  if (!location) {
    return (
      <aside className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground h-fit sticky top-20">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
        <p className="text-sm">Selecciona una ubicación en la escena 2D o 3D para ver su detalle.</p>
      </aside>
    );
  }

  const visual = resolveLocationVisualState(
    {
      ocupacion_actual: Number(location.ocupacion_actual ?? location.ocupacionActual ?? 0),
      capacidad_maxima: Number(location.capacidad_maxima ?? location.capacidadMax ?? 100),
      estado: location.estado,
    },
    organizacion.configuracion,
  );

  const openForm = (tipo: "entrada_proveedor" | "salida_produccion" | "traslado_interno") => {
    setMovementInitialType(tipo);
    setOpenMovement(true);
  };

  const capMax = Number(location.capacidad_maxima ?? location.capacidadMax ?? 0);
  const ocupActual = Number(location.ocupacion_actual ?? location.ocupacionActual ?? 0);
  const unidad = location.unidad_capacidad ?? location.unidadMedida ?? "unidades";
  const itemName = location.item_nombre ?? location.producto ?? location.atributos?.tipo_producto_permitido;
  const lotName = location.lote_principal ?? location.lote;

  return (
    <aside className="bg-card border border-border rounded-lg p-5 h-fit sticky top-20 space-y-4 shadow-sm animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {zoneName ? `Zona ${zoneName}` : "Ubicación"}
          </div>
          <h3 className="text-xl font-bold tracking-tight mt-0.5">{location.codigo}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge estado={location.estado} />
        <span className="text-xs text-muted-foreground">· {visual.porcentaje}% ocupado</span>
      </div>

      {/* Barra de progreso de ocupación */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(visual.porcentaje, 100)}%`, backgroundColor: visual.color }}
        />
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
        <div>
          <span className="text-muted-foreground block">Capacidad nominal</span>
          <span className="font-semibold text-sm">{capMax} {unidad}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Ocupación real</span>
          <span className="font-semibold text-sm">{ocupActual} {unidad}</span>
        </div>
      </div>

      {/* Ítems y Lotes */}
      <div className="pt-2 border-t border-border space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Existencias
        </div>
        {itemName ? (
          <div className="bg-muted/40 rounded-md p-2.5 text-xs space-y-1">
            <div className="font-semibold text-foreground">{itemName}</div>
            {lotName && <div className="text-muted-foreground">Lote: <span className="text-foreground">{lotName}</span></div>}
            {location.vencimiento && (
              <div className="text-muted-foreground">Vencimiento: <span className="text-foreground">{location.vencimiento}</span></div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-1">
            Sin existencias asignadas actualmente.
          </div>
        )}
      </div>

      {/* Atributos personalizados dinámicos */}
      {location.atributos && Object.keys(location.atributos).length > 0 && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Atributos
          </div>
          <div className="space-y-1 text-xs">
            {Object.entries(location.atributos).map(([k, v]) => (
              <div key={k} className="flex justify-between text-muted-foreground">
                <span className="capitalize">{k.replace(/_/g, " ")}:</span>
                <span className="font-medium text-foreground">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones operativas autorizadas por RBAC */}
      {can("movimiento:create") && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Registrar operación</div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-9 flex flex-col gap-0.5"
              onClick={() => openForm("entrada_proveedor")}
            >
              <ArrowDownToLine className="h-3.5 w-3.5 text-status-disponible" />
              <span>Entrada</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-9 flex flex-col gap-0.5"
              onClick={() => openForm("salida_produccion")}
            >
              <ArrowUpFromLine className="h-3.5 w-3.5 text-destructive" />
              <span>Salida</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-9 flex flex-col gap-0.5"
              onClick={() => openForm("traslado_interno")}
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>Traslado</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modal de formulario de movimiento */}
      {openMovement && (
        <MovimientoForm
          open={openMovement}
          onOpenChange={(open) => {
            setOpenMovement(open);
            if (!open) onRefresh?.();
          }}
          container={location}
          availableContainers={[location]}
          initialTipo={movementInitialType}
        />
      )}
    </aside>
  );
};
