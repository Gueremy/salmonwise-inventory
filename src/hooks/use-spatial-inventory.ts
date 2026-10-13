import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import { fetchSites, fetchSiteById } from "@/api/sites";
import { fetchZonesBySite, fetchZoneById, fetchZoneTree } from "@/api/zones";
import { fetchLocationsByZone, fetchLocationById } from "@/api/locations";
import { fetchItems } from "@/api/items";
import { fetchActiveAlerts } from "@/api/alerts";

export function useSitesQuery() {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["sites", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchSites(accessToken!),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useSiteDetailQuery(siteId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["site", siteId, accessToken],
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => fetchSiteById(accessToken!, siteId!),
  });
}

export function useZonesQuery(siteId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["zones", siteId, accessToken],
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => fetchZonesBySite(accessToken!, siteId!),
    staleTime: 1000 * 60 * 2,
  });
}

export function useZoneTreeQuery(siteId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["zone-tree", siteId, accessToken],
    enabled: Boolean(accessToken) && Boolean(siteId),
    queryFn: () => fetchZoneTree(accessToken!, siteId!),
  });
}

export function useZoneDetailQuery(zoneId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["zone", zoneId, accessToken],
    enabled: Boolean(accessToken) && Boolean(zoneId),
    queryFn: () => fetchZoneById(accessToken!, zoneId!),
  });
}

export function useLocationsQuery(zoneId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["locations", zoneId, accessToken],
    enabled: Boolean(accessToken) && Boolean(zoneId),
    queryFn: () => fetchLocationsByZone(accessToken!, zoneId!),
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useLocationDetailQuery(locationId: string | undefined) {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["location", locationId, accessToken],
    enabled: Boolean(accessToken) && Boolean(locationId),
    queryFn: () => fetchLocationById(accessToken!, locationId!),
  });
}

export function useItemsCatalogQuery() {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["items-catalog", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchItems(accessToken!),
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveAlertsQuery() {
  const { accessToken } = useRole();
  return useQuery({
    queryKey: ["active-alerts", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchActiveAlerts(accessToken!),
    refetchInterval: 15000, // cada 15 segundos
  });
}
