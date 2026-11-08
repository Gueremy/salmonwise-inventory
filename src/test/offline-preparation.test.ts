import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/offline/db";
import { getOfflinePackage, prepareOffline, type OfflinePackage } from "@/offline/preparation";

const snapshot = (user: string): OfflinePackage => ({
  key: `org:${user}`, organization_id: "org", user_id: user,
  prepared_at: new Date().toISOString(), offline_until: new Date(Date.now() + 72 * 3600000).toISOString(),
  permissions: ["movimiento:create"], sites: [], zones: [], locations: [], items: [], lots: [],
  movement_types: [], rules: [], balances: [],
});

beforeEach(async () => {
  await db.offlinePackages.clear();
  vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve({}) } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("preparación offline por cuenta", () => {
  it("un fallo de almacenamiento conserva la descarga anterior y la cola", async () => {
    const previous = snapshot("user-a");
    await db.offlinePackages.put(previous);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot("user-a")))));
    const write = vi.spyOn(db.offlinePackages, "put").mockRejectedValueOnce(new DOMException("Quota exceeded", "QuotaExceededError"));
    await expect(prepareOffline("token", "org", "user-a")).rejects.toThrow(/espacio suficiente/);
    write.mockRestore();
    expect(await getOfflinePackage("org", "user-a")).toEqual(previous);
  });
  it("no declara listo un navegador que no puede arrancar sin red", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot("user-a")))));
    await expect(prepareOffline("token", "org", "user-a")).rejects.toThrow(/HTTPS/);
    expect(await db.offlinePackages.count()).toBe(0);
  });
  it("bloquea escritura con fechas inválidas o una ventana mayor de 72 horas", async () => {
    const data = snapshot("user-a");
    data.offline_until = "fecha inválida";
    await db.offlinePackages.put(data);
    await expect(getOfflinePackage("org", "user-a", true)).rejects.toThrow(/venc/);
    data.prepared_at = new Date(Date.now() - 73 * 3600000).toISOString();
    data.offline_until = new Date(Date.now() + 3600000).toISOString();
    await db.offlinePackages.put(data);
    await expect(getOfflinePackage("org", "user-a", true)).rejects.toThrow(/venc/);
  });
  it("conserva el paquete al reabrir y no comparte datos con otra cuenta", async () => {
    await db.offlinePackages.put(snapshot("user-a"));
    await expect(getOfflinePackage("org", "user-a", true)).resolves.toMatchObject({ user_id: "user-a" });
    await expect(getOfflinePackage("org", "user-b")).rejects.toThrow(/Prepara/);
  });
  it("vence la autorización de escritura a las 72 horas conservando datos y cola", async () => {
    const data = snapshot("user-a");
    data.offline_until = new Date(Date.now() - 1000).toISOString();
    await db.offlinePackages.put(data);
    await expect(getOfflinePackage("org", "user-a", true)).rejects.toThrow(/venc/);
    expect(await db.offlinePackages.count()).toBe(1);
  });
  it("reemplaza completamente el alcance descargado y rechaza una respuesta de otra cuenta", async () => {
    await db.offlinePackages.put({ ...snapshot("user-a"), sites: [{ id: "revoked" } as never] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot("user-a")))));
    await prepareOffline("token", "org", "user-a");
    expect((await getOfflinePackage("org", "user-a")).sites).toHaveLength(0);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot("user-b")))));
    await expect(prepareOffline("token", "org", "user-a")).rejects.toThrow(/cuenta actual/);
    await expect(getOfflinePackage("org", "user-b")).rejects.toThrow();
  });
});
