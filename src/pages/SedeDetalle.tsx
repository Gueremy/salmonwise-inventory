import { useParams, useNavigate } from "react-router-dom";
import { Ship, Factory, Warehouse, Box, MapPin, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useSede } from "@/hooks/useSedes";
import { useGalpones } from "@/hooks/useGalpones";
import type { GalponAPI, TipoSede } from "@/types";

const tipoIcon: Record<TipoSede, React.ComponentType<{ className?: string }>> = {
  embarcacion: Ship,
  planta:      Factory,
  bodega:      Warehouse,
};

const tipoLabel: Record<TipoSede, string> = {
  embarcacion: 'Embarcación',
  planta:      'Planta',
  bodega:      'Bodega',
};

function GalponCard({ galpon, onClick }: { galpon: GalponAPI; onClick: () => void }) {
  const pct = galpon.capacidad_total > 0
    ? Math.round((galpon.ocupacion_actual / galpon.capacidad_total) * 100)
    : 0;
  const color = pct >= 80
    ? 'var(--color-status-critico)'
    : pct >= 41
    ? 'var(--color-status-medio)'
    : 'var(--color-status-disponible)';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{galpon.codigo} · {galpon.nombre}</span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {pct}%
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {galpon.ocupacion_actual.toLocaleString('es-CL')} / {galpon.capacidad_total.toLocaleString('es-CL')} kg
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </button>
  );
}

function SkeletonGalpones() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function SedeDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sede, isLoading: loadingSede, isError: errorSede } = useSede(id);
  const { data: galpones, isLoading: loadingGalpones } = useGalpones(id);

  if (loadingSede) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (errorSede || !sede) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--color-status-critico)' }}>
          No se pudo cargar la sede. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
    );
  }

  const Icon = tipoIcon[sede.tipo_operacion] ?? Warehouse;
  const pct = sede.capacidad_total > 0
    ? Math.round((sede.ocupacion_actual / sede.capacidad_total) * 100)
    : 0;

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Sedes", to: "/sedes" }, { label: sede.nombre }]} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-4">
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-lg leading-tight">{sede.nombre}</h2>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {tipoLabel[sede.tipo_operacion]}
            </p>

            <div className="space-y-3 mt-5">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {sede.ciudad}, {sede.region}
              </div>
              {sede.responsable && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {sede.responsable}
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                  <span>Ocupación</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full" style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80
                      ? 'var(--color-status-critico)'
                      : pct >= 41
                      ? 'var(--color-status-medio)'
                      : 'var(--color-status-disponible)',
                  }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Galpones</div>
                  <div className="text-xl font-bold flex items-center gap-1.5">
                    <Box className="h-4 w-4 text-primary" />
                    {loadingGalpones ? <Skeleton className="h-6 w-8" /> : (galpones?.length ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Capacidad</div>
                  <div className="text-sm font-bold">{sede.capacidad_total.toLocaleString('es-CL')} kg</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div>
          <Tabs defaultValue="galpones">
            <TabsList className="mb-4">
              <TabsTrigger value="galpones">Galpones</TabsTrigger>
              <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
            </TabsList>

            <TabsContent value="galpones">
              {loadingGalpones ? (
                <SkeletonGalpones />
              ) : galpones?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Esta sede no tiene galpones registrados.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {galpones?.map((g) => (
                    <GalponCard
                      key={g.id}
                      galpon={g}
                      onClick={() => navigate(`/sedes/${id}/galpones/${g.id}`)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="estadisticas">
              <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                Estadísticas detalladas próximamente.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
