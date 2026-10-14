import { apiFetch, apiFetchAllPages } from "./client";
import { Zone, ZoneTreeNode } from "../domain/zone";

export async function fetchZonesBySite(token: string, siteId: string): Promise<Zone[]> {
  return apiFetchAllPages<Zone>("/api/v2/zonas", token, { id_sitio: siteId });
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
