import { Link } from "react-router-dom";
import { Boxes } from "lucide-react";
import { ocupacionToEstado, estadoColor } from "@/data/mock";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

export default function Inventario() {
  const inventoryQuery = useInventorySnapshot();
  const sedes = inventoryQuery.data?.sedes ?? [];
  const galpones = inventoryQuery.data?.galpones ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Selecciona una sede para entrar a su vista 3D.
      </p>
      <p className="text-xs text-muted-foreground">
        {inventoryQuery.isSuccess ? "Snapshot live del inventario" : inventoryQuery.isError ? "No se pudo cargar el snapshot live" : "Cargando snapshot live"}
      </p>

      {inventoryQuery.isError && (
        <div className="rounded-lg border border-status-medio/30 bg-status-medio/10 px-4 py-3 text-sm text-status-medio">
          El inventario no esta disponible desde la API en este momento.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sedes.map((sede) => {
          const sedeGalpones = galpones.filter((galpon) => galpon.sedeId === sede.id);

          return (
            <Link
              key={sede.id}
              to={`/sedes/${sede.id}`}
              className="bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition"
            >
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{sede.nombre}</h3>
              </div>
              <div className="flex gap-1.5 mt-2">
                {sedeGalpones.map((galpon) => {
                  const estado = ocupacionToEstado(galpon.ocupacion_prom);

                  return (
                    <div
                      key={galpon.id}
                      className="flex-1 rounded p-2 text-[11px]"
                      style={{ backgroundColor: `${estadoColor[estado]}22`, color: estadoColor[estado] }}
                    >
                      <div className="font-bold">{galpon.codigo}</div>
                      <div>{galpon.ocupacion_prom}%</div>
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
        {sedes.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No hay sedes disponibles para explorar.
          </div>
        )}
      </div>
    </div>
  );
}
