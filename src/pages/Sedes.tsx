import { Link } from "react-router-dom";
import { Ship, Factory, Warehouse, Bell, ArrowRight } from "lucide-react";
import { ocupacionToEstado, estadoColor } from "@/lib/inventory";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

const tipoIcon = { embarcacion: Ship, planta: Factory, bodega: Warehouse };

export default function Sedes() {
  const inventoryQuery = useInventorySnapshot();
  const sedes = inventoryQuery.data?.sedes ?? [];
  const galpones = inventoryQuery.data?.galpones ?? [];
  const alertasTotales = sedes.reduce((total, sede) => total + sede.alertas, 0);
  const ocupacionPromedio = sedes.length > 0 ? Math.round(sedes.reduce((total, sede) => total + sede.ocupacion, 0) / sedes.length) : 0;

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Vista global de las sedes de Skretting Los Lagos.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {inventoryQuery.isSuccess ? "Datos live desde FastAPI" : inventoryQuery.isError ? "No se pudieron cargar datos desde la API" : "Cargando datos live"}
        </p>
      </div>

      {inventoryQuery.isError && (
        <div className="rounded-lg border border-status-medio/30 bg-status-medio/10 px-4 py-3 text-sm text-status-medio">
          La API no esta disponible en este momento. No se mostraran datos simulados para evitar decisiones sobre inventario incorrecto.
        </div>
      )}

      <div
        className="bg-card rounded-lg border border-border/60 shadow-sm p-6 mb-6 relative overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(135deg, hsl(var(--primary)/0.04), hsl(var(--secondary)/0.06))",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative">
          <div className="text-sm font-medium text-primary mb-2">Mapa de operaciones</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {sedes.map((sede) => {
              const Icon = tipoIcon[sede.tipo];
              const estado = ocupacionToEstado(sede.ocupacion);

              return (
                <Link
                  key={sede.id}
                  to={`/sedes/${sede.id}`}
                  className="group bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[estado] }} />
                  </div>
                  <div className="font-semibold text-sm leading-tight mb-1">{sede.nombre}</div>
                  <div className="text-xs text-muted-foreground capitalize mb-3">{sede.tipo}</div>

                  <div className="text-xs font-medium mb-1 flex justify-between">
                    <span>Ocupacion</span>
                    <span>{sede.ocupacion}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${sede.ocupacion}%`, backgroundColor: estadoColor[estado] }} />
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className={`flex items-center gap-1 ${sede.alertas > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      <Bell className="h-3 w-3" /> {sede.alertas} alertas
                    </span>
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      Ver <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {sedes.length === 0 && (
            <div className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay sedes disponibles para mostrar.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Sedes activas</div>
          <div className="text-2xl font-bold mt-1">{sedes.length}</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Total alertas</div>
          <div className="text-2xl font-bold mt-1 text-destructive">{alertasTotales}</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Ocupacion promedio</div>
          <div className="text-2xl font-bold mt-1">{ocupacionPromedio}%</div>
        </div>
        <div className="kpi-card">
          <div className="text-xs text-muted-foreground">Galpones visibles</div>
          <div className="text-2xl font-bold mt-1">{galpones.length}</div>
        </div>
      </div>
    </div>
  );
}
