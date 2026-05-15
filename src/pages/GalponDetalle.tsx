import { useParams } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { Package, Filter } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusLegend } from "@/components/StatusLegend";
import { ContainerInfoPanel } from "@/components/ContainerInfoPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGalon } from "@/hooks/useGalpones";
import { useSede } from "@/hooks/useSedes";
import { useContainers } from "@/hooks/useContainers";
import { MovimientoForm } from "@/components/MovimientoForm";
import type { ContainerAPI, EstadoContainer } from "@/types";

const GalponScene = lazy(() =>
  import("@/components/three/GalponScene").then((m) => ({ default: m.GalponScene }))
);

const ESTADOS: Array<{ value: string; label: string }> = [
  { value: 'todos',        label: 'Todos los estados' },
  { value: 'disponible',   label: 'Disponible' },
  { value: 'medio',        label: 'Medio' },
  { value: 'critico',      label: 'Crítico' },
  { value: 'mantenimiento',label: 'Mantenimiento' },
  { value: 'cuarentena',   label: 'Cuarentena' },
];

function SceneSkeleton() {
  return <Skeleton className="w-full h-[600px] rounded-lg" />;
}

export default function GalponDetalle() {
  const { id, sedeId } = useParams<{ id: string; sedeId: string }>();
  const [selectedContainer, setSelectedContainer] = useState<ContainerAPI | null>(null);
  const [openMov, setOpenMov] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');

  const { data: galpon, isLoading: loadingGalpon, isError: errorGalpon } = useGalon(id);
  const resolvedSedeId = sedeId ?? galpon?.id_sede;
  const { data: sede } = useSede(resolvedSedeId);

  const filtroParam = estadoFiltro !== 'todos' ? (estadoFiltro as EstadoContainer) : undefined;
  const { data: containers, isLoading: loadingContainers } = useContainers(id, {
    estado: filtroParam,
  });

  if (loadingGalpon) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-8 w-48" />
        <SceneSkeleton />
      </div>
    );
  }

  if (errorGalpon || !galpon) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--color-status-critico)' }}>
          No se pudo cargar el galpón. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Sedes", to: "/sedes" },
    ...(sede ? [{ label: sede.nombre, to: `/sedes/${sede.id}` }] : []),
    { label: `Galpón ${galpon.codigo} — ${galpon.nombre}` },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Galpón {galpon.codigo} — {galpon.nombre}</h2>
              <p className="text-sm text-muted-foreground">
                {loadingContainers ? '...' : (containers?.length ?? 0)} containers mostrados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-48 min-h-[44px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Suspense fallback={<SceneSkeleton />}>
            {loadingContainers ? (
              <SceneSkeleton />
            ) : (
              <GalponScene
                containers={containers ?? []}
                selectedId={selectedContainer?.id ?? null}
                onSelect={setSelectedContainer}
                filas={galpon.filas}
                columnas={galpon.columnas}
              />
            )}
          </Suspense>

          <StatusLegend containers={containers} />
        </div>

        <aside className="bg-card border border-border rounded-lg p-5 h-fit sticky top-20">
          {!selectedContainer ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecciona un container en la escena 3D para ver detalle.</p>
            </div>
          ) : (
            <ContainerInfoPanel
              container={selectedContainer}
              onClose={() => setSelectedContainer(null)}
              onRegistrarMovimiento={() => setOpenMov(true)}
            />
          )}
        </aside>
      </div>

      <MovimientoForm open={openMov} onOpenChange={setOpenMov} container={selectedContainer ?? undefined} />
    </div>
  );
}
