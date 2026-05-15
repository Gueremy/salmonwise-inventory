import { Link } from "react-router-dom";
import { Ship, Factory, Warehouse, ArrowRight, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSedes } from "@/hooks/useSedes";
import { useAuthStore } from "@/store/authStore";
import type { SedeAPI, TipoSede } from "@/types";

const tipoIcon: Record<TipoSede, React.ComponentType<{ className?: string }>> = {
  embarcacion: Ship,
  planta: Factory,
  bodega: Warehouse,
};

const tipoLabel: Record<TipoSede, string> = {
  embarcacion: 'Embarcación',
  planta:      'Planta',
  bodega:      'Bodega',
};

function OcupacionBar({ pct }: { pct: number }) {
  const color = pct >= 80
    ? 'var(--color-status-critico)'
    : pct >= 41
    ? 'var(--color-status-medio)'
    : 'var(--color-status-disponible)';
  return (
    <div>
      <div className="text-xs font-medium mb-1 flex justify-between" style={{ color: 'var(--color-ink-secondary)' }}>
        <span>Ocupación</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function SedeCard({ sede }: { sede: SedeAPI }) {
  const Icon = tipoIcon[sede.tipo_operacion] ?? Warehouse;
  const pct = sede.capacidad_total > 0
    ? Math.round((sede.ocupacion_actual / sede.capacidad_total) * 100)
    : 0;

  return (
    <Link
      to={`/sedes/${sede.id}`}
      className="group bg-card border border-border rounded-lg p-5 hover:shadow-md hover:border-primary transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className="px-2 py-0.5 rounded text-[11px] font-semibold"
          style={
            sede.activo
              ? { backgroundColor: 'var(--color-status-disponible-bg)', color: 'var(--color-status-disponible)' }
              : { backgroundColor: 'var(--color-status-mantenimiento-bg)', color: 'var(--color-status-mantenimiento)' }
          }
        >
          {sede.activo ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div>
        <div className="font-semibold text-sm leading-tight">{sede.nombre}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {tipoLabel[sede.tipo_operacion]} · {sede.ciudad}, {sede.region}
        </div>
      </div>

      <OcupacionBar pct={pct} />

      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-muted-foreground">
          {sede.ocupacion_actual.toLocaleString('es-CL')} / {sede.capacidad_total.toLocaleString('es-CL')} kg
        </span>
        <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition">
          Ver <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-5 space-y-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function Sedes() {
  const { data: sedes, isLoading, isError } = useSedes();
  const usuario = useAuthStore((s) => s.usuario);
  const esSuperAdmin = usuario?.rol === 'super_admin';

  const activas    = sedes?.filter((s) => s.activo).length ?? 0;
  const totalPct   = sedes?.length
    ? Math.round(
        sedes.reduce((acc, s) => {
          const p = s.capacidad_total > 0 ? (s.ocupacion_actual / s.capacidad_total) * 100 : 0;
          return acc + p;
        }, 0) / sedes.length
      )
    : 0;

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--color-status-critico)' }}>
          No se pudieron cargar las sedes. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Vista global de todas las sedes operativas de Skretting Chile
        </p>
        {esSuperAdmin && (
          <Button className="min-h-[44px]" style={{ backgroundColor: 'var(--color-action-primary)' }}>
            <Plus className="h-4 w-4 mr-1.5" /> Nueva sede
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sedes?.map((s) => <SedeCard key={s.id} sede={s} />)}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Sedes activas</div>
          <div className="text-2xl font-bold mt-1">{isLoading ? <Skeleton className="h-7 w-12" /> : activas}</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Total sedes</div>
          <div className="text-2xl font-bold mt-1">{isLoading ? <Skeleton className="h-7 w-12" /> : (sedes?.length ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Ocupación promedio</div>
          <div className="text-2xl font-bold mt-1">{isLoading ? <Skeleton className="h-7 w-16" /> : `${totalPct}%`}</div>
        </div>
      </div>
    </div>
  );
}
