import { db } from "./db";
import { Site } from "@/domain/site";
import { Zone } from "@/domain/zone";
import { Location } from "@/domain/location";
import { Item } from "@/domain/item";

export async function saveCatalogToCache(data: {
  sites?: Site[];
  zones?: Zone[];
  locations?: Location[];
  items?: Item[];
}): Promise<void> {
  await db.transaction("rw", [db.sites, db.zones, db.locations, db.items], async () => {
    if (data.sites && data.sites.length > 0) {
      await db.sites.bulkPut(data.sites);
    }
    if (data.zones && data.zones.length > 0) {
      await db.zones.bulkPut(data.zones);
    }
    if (data.locations && data.locations.length > 0) {
      await db.locations.bulkPut(data.locations);
    }
    if (data.items && data.items.length > 0) {
      await db.items.bulkPut(data.items);
    }
  });
}

export async function getCachedSites(orgId?: string): Promise<Site[]> {
  if (orgId) {
    return db.sites.where("id_organizacion").equals(orgId).toArray();
  }
  return db.sites.toArray();
}

export async function getCachedZones(siteId: string): Promise<Zone[]> {
  return db.zones.where("id_sitio").equals(siteId).toArray();
}

export async function getCachedLocations(zoneId: string): Promise<Location[]> {
  return db.locations.where("id_zona").equals(zoneId).toArray();
}

export async function getCachedItems(orgId?: string): Promise<Item[]> {
  if (orgId) {
    return db.items.where("id_organizacion").equals(orgId).toArray();
  }
  return db.items.toArray();
}
