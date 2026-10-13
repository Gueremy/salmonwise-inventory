import { apiFetch } from "./client";
import { Location } from "../domain/location";
import { PaginatedResponse } from "./sites";

export async function fetchLocationsByZone(token: string, zoneId: string): Promise<Location[]> {
  try {
    const res = await apiFetch<Location[] | PaginatedResponse<Location>>("/api/v2/ubicaciones", {
      token,
      params: { id_zona: zoneId, limit: 500 },
    });
    return Array.isArray(res) ? res : res.items;
  } catch {
    // Adaptador legacy /containers
    const legacy = await apiFetch<PaginatedResponse<any>>("/containers?limit=500", { token });
    return legacy.items
      .filter((c) => c.id_galpon === zoneId)
      .map((c) => ({
        id: c.id,
        id_organizacion: "default",
        id_zona: c.id_galpon,
        codigo: c.codigo,
        capacidad_maxima: c.capacidad_max,
        unidad_capacidad: c.unidad_medida,
        ocupacion_actual: c.ocupacion_actual,
        permite_mezcla_lotes: true,
        estado: c.estado,
        layout: {
          x: c.posicion_col,
          y: 0,
          z: c.posicion_fila,
          posicion_fila: c.posicion_fila,
          posicion_col: c.posicion_col,
        },
        atributos: { tipo_producto_permitido: c.tipo_producto_permitido },
        activo: true,
        fecha_creacion: new Date().toISOString(),
      }));
  }
}

export async function fetchLocationById(token: string, id: string): Promise<Location> {
  return apiFetch<Location>(`/api/v2/ubicaciones/${id}`, { token });
}

export async function updateLocation(token: string, id: string, payload: Partial<Location>): Promise<Location> {
  return apiFetch<Location>(`/api/v2/ubicaciones/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateLocationStatus(token: string, id: string, estado: string): Promise<Location> {
  return apiFetch<Location>(`/api/v2/ubicaciones/${id}/estado`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ estado }),
  });
}
