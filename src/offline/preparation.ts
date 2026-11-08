import { apiFetch } from "@/api/client";
import { db } from "./db";
import type { Site } from "@/domain/site";
import type { Zone } from "@/domain/zone";
import type { Location } from "@/domain/location";
import type { Item } from "@/domain/item";
import type { Lot } from "@/domain/lot";
import type { LocationRule } from "@/domain/rules";
import type { MovementTypeConfig } from "@/domain/movement";

export interface OfflinePackage {
  key: string;
  organization_id: string;
  user_id: string;
  prepared_at: string;
  offline_until: string;
  permissions: string[];
  sites: Site[];
  zones: Zone[];
  locations: Location[];
  items: Item[];
  lots: Lot[];
  movement_types: MovementTypeConfig[];
  rules: LocationRule[];
  balances: Array<{id_ubicacion: string; id_item: string; id_lote?: string | null; cantidad: number; unidad_medida: string}>;
}

export const packageKey = (orgId: string, userId: string) => `${orgId}:${userId}`;

export async function getOfflinePackage(orgId: string, userId: string, requireWrite = false): Promise<OfflinePackage> {
  const data = await db.offlinePackages.get(packageKey(orgId, userId));
  if (!data || data.organization_id !== orgId || data.user_id !== userId) {
    throw new Error("Prepara este dispositivo con conexión para descargar tus datos autorizados.");
  }
  const prepared = Date.parse(data.prepared_at);
  const until = Date.parse(data.offline_until);
  if (requireWrite && (!data.permissions.includes("movimiento:create") || !Number.isFinite(prepared) || !Number.isFinite(until)
    || Date.now() >= until || Date.now() < prepared || Date.now() - prepared >= 72 * 3600000)) {
    throw new Error("El permiso offline venció. Conéctate y prepara nuevamente el dispositivo; tus movimientos pendientes se conservan.");
  }
  return data;
}

export async function prepareOffline(token: string, orgId: string, userId: string) {
  const data = await apiFetch<OfflinePackage>("/api/v2/sesion/offline", { token });
  if (data.organization_id !== orgId || data.user_id !== userId) throw new Error("La descarga no corresponde a la cuenta actual.");
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no permite instalar la aplicación sin conexión. Abre la aplicación mediante HTTPS en Chrome o Edge.");
  }
  {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("La aplicación todavía no está instalada para abrir sin conexión. Recarga con red e inténtalo nuevamente.")), 15000);
      })]);
    } finally { clearTimeout(timer); }
  }
  // One atomic replacement also removes records revoked since the previous preparation.
  try {
    await db.offlinePackages.put({ ...data, key: packageKey(orgId, userId) });
  } catch (cause) {
    if (cause && typeof cause === "object" && "name" in cause && cause.name === "QuotaExceededError") {
      throw new Error("No hay espacio suficiente para preparar el dispositivo. Libera espacio sin borrar los datos de esta aplicación; tus movimientos pendientes se conservan.");
    }
    throw cause;
  }
  const persistent = await navigator.storage?.persist?.().catch(() => false) ?? false;
  return { data, persistent };
}

export async function offlineRead<T>(org: string, user: string, online: () => Promise<T>, local: (data: OfflinePackage) => T): Promise<T> {
  if (navigator.onLine) {
    try { return await online(); } catch (error) { if (!(error instanceof TypeError)) throw error; }
  }
  return local(await getOfflinePackage(org, user));
}
