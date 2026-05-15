import { Package, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContainerAPI, EstadoContainer } from "@/types";
import { estadoLabel } from "@/types";
import { differenceInDays, parseISO } from "date-fns";

const TOKEN_BG: Record<EstadoContainer, string> = {
  disponible:    'var(--color-status-disponible-bg)',
  medio:         'var(--color-status-medio-bg)',
  critico:       'var(--color-status-critico-bg)',
  mantenimiento: 'var(--color-status-mantenimiento-bg)',
  cuarentena:    'var(--color-status-cuarentena-bg)',
};

const TOKEN_FG: Record<EstadoContainer, string> = {
  disponible:    'var(--color-status-disponible)',
  medio:         'var(--color-status-medio)',
  critico:       'var(--color-status-critico)',
  mantenimiento: 'var(--color-status-mantenimiento)',
  cuarentena:    'var(--color-status-cuarentena)',
};

interface Props {
  container: ContainerAPI;
  onClose: () => void;
  onRegistrarMovimiento: () => void;
}

function diasParaVencer(fecha: string): number {
  return differenceInDays(parseISO(fecha), new Date());
}

export const ContainerInfoPanel = ({ container, onClose, onRegistrarMovimiento }: Props) => {
  const pct = container.capacidad_max > 0
    ? Math.round((container.ocupacion_actual / container.capacidad_max) * 100)
    : 0;

  const diasVence = container.fecha_vencimiento
    ? diasParaVencer(container.fecha_vencimiento)
    : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Container</div>
          <h3 className="text-xl font-bold">{container.codigo}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <span
        className="badge-status inline-flex"
        style={{ backgroundColor: TOKEN_BG[container.estado], color: TOKEN_FG[container.estado] }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full mr-1.5"
          style={{ backgroundColor: TOKEN_FG[container.estado] }}
        />
        {estadoLabel[container.estado]}
      </span>

      {container.nombre_producto ? (
        <>
          <div className="space-y-3 pt-2 border-t border-border">
            <InfoRow label="Producto" value={container.nombre_producto ?? '—'} icon={Package} />

            <div>
              <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                <span>Ocupación</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: TOKEN_FG[container.estado],
                  }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {container.ocupacion_actual.toLocaleString('es-CL')} / {container.capacidad_max.toLocaleString('es-CL')} kg
              </div>
            </div>

            {container.numero_lote && (
              <InfoRow label="Lote" value={container.numero_lote} />
            )}

            {diasVence !== null && (
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                  Vencimiento
                </span>
                <span className="text-right">
                  <span className="font-medium">
                    {diasVence > 0
                      ? `En ${diasVence} días`
                      : diasVence === 0
                      ? 'Vence hoy'
                      : `Venció hace ${Math.abs(diasVence)} días`}
                  </span>
                  {diasVence <= 30 && diasVence > 0 && (
                    <div
                      className="text-xs font-medium mt-0.5"
                      style={{ color: 'var(--color-status-medio)' }}
                    >
                      Próximo a vencer
                    </div>
                  )}
                  {diasVence <= 0 && (
                    <div
                      className="text-xs font-medium mt-0.5"
                      style={{ color: 'var(--color-status-critico)' }}
                    >
                      Producto vencido
                    </div>
                  )}
                </span>
              </div>
            )}

            {container.temperatura_almacen !== undefined && (
              <InfoRow label="Temperatura" value={`${container.temperatura_almacen}°C`} />
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Button
              className="w-full min-h-[56px] text-base"
              style={{ backgroundColor: 'var(--color-action-primary)' }}
              onClick={onRegistrarMovimiento}
            >
              Registrar movimiento
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground pt-3 border-t border-border">
          Container vacío o en estado especial.
        </p>
      )}
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const InfoRow = ({ label, value, icon: Icon }: InfoRowProps) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
