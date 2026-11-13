import { SensitiveText } from "@/privacy/EvidenceMode";
import { lazy, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ocupacionToEstado, estadoColor } from "@/lib/inventory";
import { SceneBoundary, SceneLoading } from "@/components/three/SceneBoundary";
import { detectWebGL } from "@/components/three/sceneQuality";
import { StatusLegend } from "@/components/StatusLegend";
import { Bell, Box, Ship, Factory, Warehouse } from "lucide-react";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";
import { useRole } from "@/context/RoleContext";

const tipoIcon = { embarcacion: Ship, planta: Factory, bodega: Warehouse };

// El motor 3D se descarga solo al abrir esta vista.
const SedeScene = lazy(() => import("@/components/three/SedeScene").then((module) => ({ default: module.SedeScene })));

const SceneUnavailable = () => (
  <div role="status" className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
    La vista 3D no está disponible en este dispositivo. Usa la lista de zonas para entrar a cada una.
  </div>
);

export default function SedeDetalle() {
  const { organizacion } = useRole();
  const { id } = useParams();
  const navigate = useNavigate();
  const inventoryQuery = useInventorySnapshot();
  const sedes = inventoryQuery.data?.sedes ?? [];
  const galpones = inventoryQuery.data?.galpones ?? [];
  const sede = sedes.find((item) => item.id === id);
  const sedeGalpones = galpones.filter((item) => item.sedeId === id);
  const [sceneAvailable, setSceneAvailable] = useState(detectWebGL);

  if (inventoryQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando sede...</div>;
  }

  if (inventoryQuery.isError) {
    return <div className="p-6 text-sm text-muted-foreground">No se pudo cargar la sede desde la API.</div>;
  }

  if (!sede) {
    return (
      <div className="p-6">
        <p>Sede no encontrada.</p>
      </div>
    );
  }

  const Icon = tipoIcon[sede.tipo];

  return (
    <div className="p-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Lugares", to: "/sites" }, { sensitive: true, label: sede.nombre }]} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-lg leading-tight"><SensitiveText category="Dato" value={sede.nombre} /></h2>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{sede.tipo}</p>

            <div className="space-y-3 mt-5">
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                  <span>Ocupacion</span>
                  <span className="font-medium">{sede.ocupacion}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${sede.ocupacion}%`, backgroundColor: estadoColor[ocupacionToEstado(sede.ocupacion, organizacion.configuracion)] }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Zonas</div>
                  <div className="text-xl font-bold flex items-center gap-1.5">
                    <Box className="h-4 w-4 text-primary" />
                    {sedeGalpones.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alertas</div>
                  <div className={`text-xl font-bold flex items-center gap-1.5 ${sede.alertas > 0 ? "text-destructive" : ""}`}>
                    <Bell className="h-4 w-4" />
                    {sede.alertas}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Zonas</h3>
            <div className="space-y-2">
              {sedeGalpones.map((galpon) => {
                const estado = ocupacionToEstado(galpon.ocupacion_prom, organizacion.configuracion);

                return (
                  <button
                    key={galpon.id}
                    onClick={() => navigate(`/sites/${id}/zones/${galpon.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-muted text-left transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[estado] }} />
                      <span className="text-sm font-medium">{galpon.codigo} · <SensitiveText category="Dato" value={galpon.nombre} /></span>
                    </span>
                    <span className="text-xs text-muted-foreground">{galpon.ocupacion_prom}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Selecciona una zona para entrar a su vista 3D. La altura del relleno indica su ocupación.
            </p>
          </div>
          {sedeGalpones.length > 0 ? (
            sceneAvailable ? (
              <SceneBoundary
                onError={() => setSceneAvailable(false)}
                loading={<SceneLoading className="h-[min(520px,65vh)] min-h-[300px]" />}
                fallback={<SceneUnavailable />}
              >
                <SedeScene
                  galpones={sedeGalpones}
                  tipo={sede.tipo}
                  sedeNombre={sede.nombre}
                  sedeId={sede.id}
                  onUnavailable={() => setSceneAvailable(false)}
                />
              </SceneBoundary>
            ) : (
              <SceneUnavailable />
            )
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Este lugar no tiene zonas disponibles para visualizar.
            </div>
          )}
          <StatusLegend />
        </div>
      </div>
    </div>
  );
}
