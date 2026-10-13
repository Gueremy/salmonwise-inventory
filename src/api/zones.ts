import { apiFetch } from "./client";
import { Zone, ZoneTreeNode } from "../domain/zone";
import { PaginatedResponse } from "./sites";
import type { ApiGalpon } from "@/lib/api";

export async function fetchZonesBySite(token: string, siteId: string): Promise<Zone[]> {
  try {
    const res = await apiFetch<Zone[] | PaginatedResponse<Zone>>("/api/v2/zonas", {
      token,
      params: { id_sitio: siteId },
    });
    return Array.isArray(res) ? res : res.items;
  } catch {
    // Adaptador legacy /galpones
    const legacy = await apiFetch<PaginatedResponse<ApiGalpon>>("/galpones", { token });
    return legacy.items
      .filter((g) => g.id_sede === siteId)
      .map((g) => ({
        id: g.id,
        id_organizacion: "default",
        id_sitio: g.id_sede,
        codigo: g.codigo,
        nombre: g.nombre,
        tipo: "galpon",
        layout: { filas: g.filas, columnas: g.columnas },
        atributos: {},
        activo: true,
        fecha_creacion: new Date().toISOString(),
      }));
  }
}

export async function fetchZoneById(token: string, id: string): Promise<Zone> {
  return apiFetch<Zone>(`/api/v2/zonas/${id}`, { token });
}

export async function fetchZoneTree(token: string, siteId: string): Promise<ZoneTreeNode[]> {
  return apiFetch<ZoneTreeNode[]>(`/api/v2/zonas/arbol/${siteId}`, { token });
}

export async function createZone(token: string, payload: Partial<Zone>): Promise<Zone> {
  return apiFetch<Zone>("/api/v2/zonas", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateZone(token: string, id: string, payload: Partial<Zone>): Promise<Zone> {
  return apiFetch<Zone>(`/api/v2/zonas/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}
