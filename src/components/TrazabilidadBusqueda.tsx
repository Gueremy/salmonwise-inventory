import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useTrazabilidad } from "@/hooks/useMovimientos";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import type { MovimientoAPI, TipoMovimiento } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const TIPO_ICON: Record<TipoMovimiento, React.ComponentType<{ className?: string }>> = {
  entrada_proveedor: ArrowDownToLine,
  salida_produccion: ArrowUpFromLine,
  traslado_interno:  RefreshCw,
};

const TIPO_LABEL: Record<TipoMovimiento, string> = {
  entrada_proveedor: 'Entrada de proveedor',
  salida_produccion: 'Salida a producción',
  traslado_interno:  'Traslado interno',
};

function TimelineItem({ mov }: { mov: MovimientoAPI }) {
  const Icon = TIPO_ICON[mov.tipo];
  const fecha = format(parseISO(mov.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es });

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border mt-1" />
      </div>
      <div className="pb-5 flex-1">
        <div className="font-medium text-sm">{TIPO_LABEL[mov.tipo]}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Ingresado por {mov.codigo_empleado_creador} el {fecha}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Container: {mov.codigo_container ?? mov.id_container}
          {mov.cantidad && <> · {mov.cantidad} {mov.unidad}</>}
        </div>
        {mov.nombre_proveedor && (
          <div className="text-xs text-muted-foreground mt-0.5">Proveedor: {mov.nombre_proveedor}</div>
        )}
      </div>
    </div>
  );
}

export const TrazabilidadBusqueda = () => {
  const [busqueda, setBusqueda] = useState('');
  const loteDebounced = useDebounce(busqueda, 500);
  const { data: movimientos, isLoading, isError } = useTrazabilidad(loteDebounced);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Número de lote (ej: LOT-2026-001)"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {loteDebounced.length <= 3 && busqueda.length > 0 && (
        <p className="text-xs text-muted-foreground">Escribe al menos 4 caracteres para buscar.</p>
      )}

      {isLoading && loteDebounced.length > 3 && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm" style={{ color: 'var(--color-status-critico)' }}>
          No se pudo buscar el lote. Intenta de nuevo.
        </p>
      )}

      {!isLoading && movimientos?.length === 0 && loteDebounced.length > 3 && (
        <p className="text-sm text-muted-foreground">No se encontraron movimientos para este lote.</p>
      )}

      {!isLoading && movimientos && movimientos.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-semibold text-sm mb-1">
            Lote: <span className="font-mono">{loteDebounced}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} encontrado{movimientos.length !== 1 ? 's' : ''}
          </div>
          <div>
            {movimientos.map((m) => <TimelineItem key={m.id} mov={m} />)}
          </div>
        </div>
      )}
    </div>
  );
};
