import { apiFetch, apiFetchAllPages } from "./client";
import { Location } from "../domain/location";

export async function fetchLocationsByZone(token: string, zoneId: string): Promise<Location[]> {
  return apiFetchAllPages<Location>("/api/v2/ubicaciones", token, { id_zona: zoneId });
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
