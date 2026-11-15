import { SensitiveText } from "@/privacy/EvidenceMode";
import { lazy, useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SceneBoundary, SceneLoading } from "@/components/three/SceneBoundary";
import { detectWebGL } from "@/components/three/sceneQuality";
import { ZoneGrid2D } from "@/components/two-d/ZoneGrid2D";
import { LocationDetailDrawer } from "@/components/locations/LocationDetailDrawer";
import { StatusLegend } from "@/components/StatusLegend";
import { Button } from "@/components/ui/button";
import { ClipboardEdit, Box, Grid3X3 } from "lucide-react";
import { MovimientoForm } from "@/components/MovimientoForm";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

// El motor 3D se descarga solo al abrir esta vista.
const ZoneScene = lazy(() => import("@/components/three/ZoneScene").then((module) => ({ default: module.ZoneScene })));

export default function GalponDetalle() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const modeParam = searchParams.get("mode");

  const inventoryQuery = useInventorySnapshot();
  const galpones = inventoryQuery.data?.galpones ?? [];
  const sedes = inventoryQuery.data?.sedes ?? [];
  const display = useMemo(
    () => (inventoryQuery.data?.containers ?? []).filter((item) => item.galponId === id),
    [inventoryQuery.data?.containers, id],
  );

  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const [openMov, setOpenMov] = useState(false);
  // Sin WebGL, o si la escena falla, la pantalla sigue operativa en 2D.
  const [sceneAvailable, setSceneAvailable] = useState(detectWebGL);
  const [viewMode, setViewMode] = useState<"3d" | "2d">(modeParam === "2d" || !sceneAvailable ? "2d" : "3d");
  const disableScene = () => {
    setSceneAvailable(false);
    setViewMode("2d");
  };

  useEffect(() => {
    if (focusId) {
      setSelectedId(focusId);
    }
  }, [focusId]);

  const selected = display.find((item) => item.id === selectedId) ?? null;

  if (inventoryQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando zona y ubicaciones...</div>;
  }

  if (inventoryQuery.isError) {
    return <div className="p-6 text-sm text-muted-foreground">No se pudo cargar la zona desde la API.</div>;
  }

  const galpon = galpones.find((item) => item.id === id);
  const sede = sedes.find((item) => item.id === galpon?.sedeId);

  if (!galpon || !sede) {
    return <div className="p-6">Zona no encontrada.</div>;
  }

  const ocupacionPromedio = display.length > 0
    ? Math.round(display.reduce((total, container) => total + container.ocupacion, 0) / display.length)
    : galpon.ocupacion_prom;

  const grid2D = (
    <ZoneGrid2D
      locations={display}
      selectedId={selectedId}
      onSelect={(loc) => setSelectedId(loc.id)}
      highlightedId={focusId}
    />
  );

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: "Lugares", to: "/sites" },
          { sensitive: true, label: sede.nombre, to: `/sites/${sede.id}` },
          { sensitive: true, label: `Zona ${galpon.codigo} · ${galpon.nombre}` },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Zona {galpon.codigo} — <SensitiveText category="Dato" value={galpon.nombre} />
              </h2>
              <p className="text-sm text-muted-foreground">
                {display.length} ubicaciones registradas · ocupación promedio {ocupacionPromedio}%
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Switch 2D / 3D */}
              <div className="flex items-center rounded-lg border border-border p-1 bg-muted/40">
                <Button
                  size="sm"
                  variant={viewMode === "3d" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs gap-1.5"
                  onClick={() => setViewMode("3d")}
                  disabled={!sceneAvailable}
                  title={sceneAvailable ? undefined : "La vista 3D no está disponible en este dispositivo"}
                >
                  <Box className="h-3.5 w-3.5" /> 3D
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "2d" ? "default" : "ghost"}
                  className="h-7 px-2.5 text-xs gap-1.5"
                  onClick={() => setViewMode("2d")}
                >
                  <Grid3X3 className="h-3.5 w-3.5" /> 2D
                </Button>
              </div>

              <Button
                onClick={() => setOpenMov(true)}
                className="bg-primary hover:bg-secondary h-9"
                disabled={display.length === 0}
              >
                <ClipboardEdit className="h-4 w-4 mr-2" /> Registrar movimiento
              </Button>
            </div>
          </div>

          {/* Renderizado condicional 2D / 3D */}
          {!sceneAvailable && (
            <p role="status" className="text-xs text-muted-foreground">
              La vista 3D no está disponible en este dispositivo. Se muestra la vista 2D.
            </p>
          )}
          {display.length > 0 ? (
            viewMode === "3d" && sceneAvailable ? (
              <SceneBoundary
                onError={disableScene}
                loading={<SceneLoading className="h-[min(600px,70vh)] min-h-[320px]" />}
                fallback={grid2D}
              >
                <ZoneScene
                  locations={display}
                  selectedId={selectedId}
                  onSelect={(loc) => setSelectedId(loc.id)}
                  highlightedId={focusId}
                  onUnavailable={disableScene}
                />
              </SceneBoundary>
            ) : (
              grid2D
            )
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
              Esta zona no tiene ubicaciones disponibles para visualizar.
            </div>
          )}

          <StatusLegend />
        </div>

        {/* Inspector lateral genérico */}
        <LocationDetailDrawer
          availableLocations={inventoryQuery.data?.containers ?? []}
          location={selected}
          onClose={() => setSelectedId(null)}
          zoneName={galpon.codigo}
          onRefresh={() => inventoryQuery.refetch()}
        />
      </div>

      {openMov && (
        <MovimientoForm
          open={openMov}
          onOpenChange={setOpenMov}
          availableContainers={display}
        />
      )}
    </div>
  );
}
