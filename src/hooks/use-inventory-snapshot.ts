import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import { fetchSites } from "@/api/sites";
import { fetchZonesBySite } from "@/api/zones";
import { fetchLocationsByZone } from "@/api/locations";
import { fetchActiveAlerts } from "@/api/alerts";
import { buildInventorySnapshot } from "@/lib/inventory";
import type { ApiSede, ApiContainer } from "@/lib/api";
import { offlineRead } from "@/offline/preparation";
import { apiFetch, apiFetchAllPages } from "@/api/client";
import type { OfflinePackage } from "@/offline/preparation";
import type { Item } from "@/domain/item";
import type { Lot } from "@/domain/lot";

const coordinate = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

type SnapshotSource = Pick<OfflinePackage, "balances" | "items" | "lots">;

/**
 * Contenido de cada ubicación a partir de los saldos. Los saldos, ítems y lotes se
 * indexan una vez: antes se recorrían completos por cada ubicación (costo cuadrático).
 */
export function locationContentIndex(data: SnapshotSource) {
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  const lotsById = new Map(data.lots.map((lot) => [lot.id, lot]));
  const balancesByLocation = new Map<string, SnapshotSource["balances"]>();
  for (const balance of data.balances) {
    if (!(Number(balance.cantidad) > 0)) continue;
    const list = balancesByLocation.get(balance.id_ubicacion);
    if (list) list.push(balance);
    else balancesByLocation.set(balance.id_ubicacion, [balance]);
  }

  return (locationId: string) => {
    const balances = balancesByLocation.get(locationId) ?? [];
    const items = balances.map((balance) => itemsById.get(balance.id_item)).filter((item): item is Item => Boolean(item));
    const lots = balances.map((balance) => (balance.id_lote ? lotsById.get(balance.id_lote) : undefined)).filter((lot): lot is Lot => Boolean(lot));
    // El modelo 3D representa el ítem con más cantidad en la ubicación.
    let main: Item | undefined;
    let mainQuantity = -Infinity;
    for (const balance of balances) {
      const item = itemsById.get(balance.id_item);
      if (item && Number(balance.cantidad) > mainQuantity) {
        main = item;
        mainQuantity = Number(balance.cantidad);
      }
    }
    return {
      producto_nombre: [...new Set(items.map((item) => item.nombre).filter(Boolean))].join(", ") || undefined,
      producto_categoria: main?.categoria || undefined,
      numero_lote: [...new Set(lots.map((lot) => lot.numero_lote))].join(", ") || undefined,
      fecha_vencimiento: lots.map((lot) => lot.fecha_vencimiento).filter(Boolean).sort()[0] ?? null,
    };
  };
}

export function useInventorySnapshot() {
  const { accessToken, organizacion, usuario } = useRole();

  const query = useQuery({
    queryKey: ["inventory-snapshot", accessToken, organizacion.id],
    enabled: Boolean(accessToken),
    networkMode: "always",
    retry: 1,
    queryFn: async () => {
      const data = await offlineRead(organizacion.id, usuario.id, async () => {
        const sites = await fetchSites(accessToken!);
        const zones = (await Promise.all(sites.map((site) => fetchZonesBySite(accessToken!, site.id)))).flat();
        const locations = (await Promise.all(zones.map((zone) => fetchLocationsByZone(accessToken!, zone.id)))).flat();
        const [items, lots, balances] = await Promise.all([
          apiFetchAllPages<Item>("/api/v2/items", accessToken!),
          apiFetchAllPages<Lot>("/api/v2/lotes", accessToken!),
          apiFetch<OfflinePackage["balances"]>("/api/v2/movimientos/saldos", { token: accessToken }),
        ]);
        return { sites, zones, locations, items, lots, balances };
      }, (cached) => cached);
      const { sites, zones: allZones, locations: allLocations } = data;
      const alerts = navigator.onLine ? await fetchActiveAlerts(accessToken!).catch(() => []) : [];
      const content = locationContentIndex(data);

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
          ...content(l.id),
          layout_x: coordinate(l.layout?.x),
          layout_z: coordinate(l.layout?.z),
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
