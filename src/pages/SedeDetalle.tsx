import { useParams, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ocupacionToEstado, estadoColor } from "@/data/mock";
import { SedeScene } from "@/components/three/SedeScene";
import { StatusLegend } from "@/components/StatusLegend";
import { Bell, Box, Ship, Factory, Warehouse } from "lucide-react";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

const tipoIcon = { embarcacion: Ship, planta: Factory, bodega: Warehouse };

export default function SedeDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inventoryQuery = useInventorySnapshot();
  const sedes = inventoryQuery.data?.sedes ?? [];
  const galpones = inventoryQuery.data?.galpones ?? [];
  const sede = sedes.find((item) => item.id === id);
  const sedeGalpones = galpones.filter((item) => item.sedeId === id);

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
      <Breadcrumbs items={[{ label: "Sedes", to: "/sedes" }, { label: sede.nombre }]} />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-lg leading-tight">{sede.nombre}</h2>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{sede.tipo}</p>

            <div className="space-y-3 mt-5">
              <div>
                <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                  <span>Ocupacion</span>
                  <span className="font-medium">{sede.ocupacion}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${sede.ocupacion}%`, backgroundColor: estadoColor[ocupacionToEstado(sede.ocupacion)] }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Galpones</div>
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
            <h3 className="text-sm font-semibold mb-3">Galpones</h3>
            <div className="space-y-2">
              {sedeGalpones.map((galpon) => {
                const estado = ocupacionToEstado(galpon.ocupacion_prom);

                return (
                  <button
                    key={galpon.id}
                    onClick={() => navigate(`/galpon/${galpon.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-muted text-left transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[estado] }} />
                      <span className="text-sm font-medium">{galpon.codigo} · {galpon.nombre}</span>
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
              Click en un galpon para entrar a su vista 3D.
            </p>
          </div>
          {sedeGalpones.length > 0 ? (
            <SedeScene galpones={sedeGalpones} tipo={sede.tipo} sedeNombre={sede.nombre} />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Esta sede no tiene galpones disponibles para visualizar.
            </div>
          )}
          <StatusLegend />
        </div>
      </div>
    </div>
  );
}
