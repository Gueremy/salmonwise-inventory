import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import { fetchSites } from "@/api/sites";
import { fetchZonesBySite } from "@/api/zones";
import { fetchLocationsByZone } from "@/api/locations";
import { fetchActiveAlerts } from "@/api/alerts";
import { buildInventorySnapshot } from "@/lib/inventory";
import type { ApiSede, ApiContainer } from "@/lib/api";

export function useInventorySnapshot() {
  const { accessToken } = useRole();

  const query = useQuery({
    queryKey: ["inventory-snapshot", accessToken],
    enabled: Boolean(accessToken),
    retry: 1,
    queryFn: async () => {
      // 1. Obtener sitios activos
      const sites = await fetchSites(accessToken!);

      // 2. Obtener zonas para cada sitio
      const zonesArrays = await Promise.all(
        sites.map((site) => fetchZonesBySite(accessToken!, site.id).catch(() => [])),
      );
      const allZones = zonesArrays.flat();

      // 3. Obtener ubicaciones para cada zona
      const locationsArrays = await Promise.all(
        allZones.map((zone) => fetchLocationsByZone(accessToken!, zone.id).catch(() => [])),
      );
      const allLocations = locationsArrays.flat();

      // 4. Obtener alertas activas
      const alerts = await fetchActiveAlerts(accessToken!).catch(() => []);

      return buildInventorySnapshot({
        sedes: sites.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          tipo: (s.tipo === "embarcacion" ? "ponton" : s.tipo === "planta" ? "planta" : "bodega") as ApiSede["tipo"],
          ubicacion: s.ubicacion_geografica ?? null,
          latitud: null,
          longitud: null,
          capacidad_total: null,
          estado: s.activo ? "activo" : "inactivo",
        })),
        galpones: allZones.map((z) => ({
          id: z.id,
          nombre: z.nombre,
          codigo: z.codigo,
          id_sede: z.id_sitio,
          filas: Number(z.layout?.filas) || 4,
          columnas: Number(z.layout?.columnas) || 5,
        })),
        containers: allLocations.map((l) => ({
          id: l.id,
          codigo: l.codigo,
          id_galpon: l.id_zona,
          posicion_fila: Number(l.layout?.posicion_fila) || 0,
          posicion_col: Number(l.layout?.posicion_col) || 0,
          estado: (["disponible", "medio", "critico", "mantenimiento", "cuarentena"].includes(l.estado)
            ? l.estado
            : "disponible") as ApiContainer["estado"],
          tipo_producto_permitido: String(l.atributos?.tipo_producto_permitido ?? "general"),
          capacidad_max: l.capacidad_maxima,
          ocupacion_actual: l.ocupacion_actual,
          unidad_medida: l.unidad_capacidad,
        })),
        alertas: alerts.map((a) => ({
          id: a.id,
          id_container: a.id_ubicacion ?? "",
          id_usuario_revision: a.id_usuario_revision ?? null,
          tipo: a.tipo,
          severidad: a.severidad,
          descripcion: a.descripcion,
          estado: a.estado,
          fecha_generacion: a.fecha_generacion,
          fecha_revision: a.fecha_revision ?? null,
        })),
      });
    },
  });

  return query;
}
