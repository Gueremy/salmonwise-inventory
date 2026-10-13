import { apiFetch } from "./client";
import { Site } from "../domain/site";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

export async function fetchSites(token: string): Promise<Site[]> {
  // Soporta tanto API v2 /api/v2/sitios como respuesta paginada o lista directa
  try {
    const res = await apiFetch<Site[] | PaginatedResponse<Site>>("/api/v2/sitios", { token });
    return Array.isArray(res) ? res : res.items;
  } catch {
    // Capa adaptadora de transición contra /sedes legacy si backend v2 no estuviera montado
    const legacy = await apiFetch<PaginatedResponse<any>>("/sedes", { token });
    return legacy.items.map((s) => ({
      id: s.id,
      id_organizacion: "default",
      codigo: s.id,
      nombre: s.nombre,
      tipo: s.tipo,
      descripcion: null,
      ubicacion_geografica: s.ubicacion,
      atributos: {},
      activo: s.estado === "activo",
      fecha_creacion: new Date().toISOString(),
    }));
  }
}

export async function fetchSiteById(token: string, id: string): Promise<Site> {
  return apiFetch<Site>(`/api/v2/sitios/${id}`, { token });
}

export async function createSite(token: string, payload: Partial<Site>): Promise<Site> {
  return apiFetch<Site>("/api/v2/sitios", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateSite(token: string, id: string, payload: Partial<Site>): Promise<Site> {
  return apiFetch<Site>(`/api/v2/sitios/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}
