import { apiFetch, apiFetchAllPages } from "./client";
import { Site } from "../domain/site";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

export async function fetchSites(token: string): Promise<Site[]> {
  return apiFetchAllPages<Site>("/api/v2/sitios", token);
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
