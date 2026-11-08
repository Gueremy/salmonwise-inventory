import { offlineRead } from "@/offline/preparation";
import type { ZoneTreeNode, Zone } from "@/domain/zone";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import { fetchSites, fetchSiteById } from "@/api/sites";
import { fetchZonesBySite, fetchZoneById, fetchZoneTree } from "@/api/zones";
import { fetchLocationsByZone, fetchLocationById } from "@/api/locations";
import { fetchItems } from "@/api/items";
import { fetchActiveAlerts } from "@/api/alerts";

export function useSitesQuery() {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["sites", accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchSites(accessToken!), (data) => data.sites),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useSiteDetailQuery(siteId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["site", siteId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchSiteById(accessToken!, siteId!), (data) => required(data.sites.find((site) => site.id === siteId))),
  });
}

export function useZonesQuery(siteId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["zones", siteId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchZonesBySite(accessToken!, siteId!), (data) => data.zones.filter((zone) => zone.id_sitio === siteId)),
    staleTime: 1000 * 60 * 2,
  });
}

export function useZoneTreeQuery(siteId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["zone-tree", siteId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchZoneTree(accessToken!, siteId!), (data) => zoneTree(data.zones.filter((zone) => zone.id_sitio === siteId))),
  });
}

export function useZoneDetailQuery(zoneId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["zone", zoneId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(zoneId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchZoneById(accessToken!, zoneId!), (data) => required(data.zones.find((zone) => zone.id === zoneId))),
  });
}

export function useLocationsQuery(zoneId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["locations", zoneId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(zoneId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchLocationsByZone(accessToken!, zoneId!), (data) => data.locations.filter((location) => location.id_zona === zoneId)),
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useLocationDetailQuery(locationId: string | undefined) {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["location", locationId, accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken) && Boolean(locationId),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchLocationById(accessToken!, locationId!), (data) => required(data.locations.find((location) => location.id === locationId))),
  });
}

export function useItemsCatalogQuery() {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["items-catalog", accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken),
    queryFn: () => offlineRead(organizacion.id, usuario.id, () => fetchItems(accessToken!), (data) => data.items),
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveAlertsQuery() {
  const { accessToken, organizacion, usuario } = useRole();
  return useQuery({
    queryKey: ["active-alerts", accessToken],
    networkMode: "always",
    enabled: Boolean(accessToken),
    queryFn: () => fetchActiveAlerts(accessToken!),
    refetchInterval: 15000, // cada 15 segundos
  });
}

function required<T>(value: T | undefined): T {
  if (!value) throw new Error("El recurso no está incluido en tus datos descargados.");
  return value;
}
function zoneTree(zones: Zone[], parent: string | null = null, visited = new Set<string>()): ZoneTreeNode[] {
  return zones.filter((zone) => (zone.id_zona_padre ?? null) === parent && !visited.has(zone.id))
    .map((zone) => ({...zone, hijos: zoneTree(zones, zone.id, new Set([...visited, zone.id]))}));
}
