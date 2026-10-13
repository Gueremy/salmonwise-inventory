import { apiFetch } from "./client";
import { LocationCoordinates } from "../domain/location";

export interface LayoutUbicacionNode {
  id: string;
  codigo: string;
  capacidad_maxima: number;
  ocupacion_actual: number;
  porcentaje_ocupacion: number;
  unidad_capacidad: string;
  estado: string;
  permite_mezcla_lotes: boolean;
  layout: LocationCoordinates;
}

export interface LayoutZonaNode {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  layout: Record<string, unknown>;
  subzonas: LayoutZonaNode[];
  ubicaciones: LayoutUbicacionNode[];
}

export interface LayoutSitioTree {
  id_sitio: string;
  codigo: string;
  nombre: string;
  tipo: string;
  zonas: LayoutZonaNode[];
}

export interface UbicacionBatchItem {
  codigo: string;
  capacidad_maxima: number;
  unidad_capacidad: string;
  layout?: LocationCoordinates;
  permite_mezcla_lotes?: boolean;
}

export async function fetchSiteLayoutTree(token: string, siteId: string): Promise<LayoutSitioTree> {
  return apiFetch<LayoutSitioTree>(`/api/v2/layout/sitios/${siteId}`, { token });
}

export async function updateZoneLayout(token: string, zoneId: string, layout: Record<string, unknown>): Promise<unknown> {
  return apiFetch(`/api/v2/layout/zonas/${zoneId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ layout }),
  });
}

export async function updateLocationLayout(token: string, locationId: string, layout: LocationCoordinates): Promise<unknown> {
  return apiFetch(`/api/v2/layout/ubicaciones/${locationId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ layout }),
  });
}

export async function batchCreateLocations(
  token: string,
  zoneId: string,
  ubicaciones: UbicacionBatchItem[],
): Promise<{ creadas: number }> {
  return apiFetch<{ creadas: number }>("/api/v2/layout/ubicaciones/batch", {
    method: "POST",
    token,
    body: JSON.stringify({ id_zona: zoneId, ubicaciones }),
  });
}
