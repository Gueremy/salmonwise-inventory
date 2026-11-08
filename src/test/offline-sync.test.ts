import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/offline/db";
import { getPendingMovements, getRejectedMovements, queueLocalMovement, updateMovementStatus } from "@/offline/movementQueue";

const syncMock = vi.hoisted(() => vi.fn());
const requestsMock = vi.hoisted(() => vi.fn());
vi.mock("@/api/movements", () => ({ syncOfflineMovements: syncMock, fetchMovementRequests: requestsMock }));
import { refreshAwaitingApprovals, syncAllPending } from "@/offline/syncEngine";

const payload = {
  organizationId: "org-1", userId: "user-1", id_tipo_movimiento: "type-1",
  id_item: "item-1", id_ubicacion_destino: "loc-1", cantidad: 2, unidad_medida: "kg",
};

describe("sincronización offline", () => {
  beforeEach(async () => {
    syncMock.mockReset();
    requestsMock.mockReset();
    await db.pendingMovements.clear();
    await db.syncLog.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("retira del saldo provisional las solicitudes aprobadas o rechazadas y respeta al propietario", async () => {
    const records = await Promise.all(Array.from({ length: 3 }, () => queueLocalMovement(payload)));
    for (const [index, row] of records.entries()) {
      await db.pendingMovements.update(row.uuid_local, { status: "synced", server_state: "pendiente", id_movimiento_servidor: `request-${index}` });
    }
    const foreign = await queueLocalMovement({ ...payload, userId: "user-2" });
    await db.pendingMovements.update(foreign.uuid_local, { status: "synced", server_state: "pendiente", id_movimiento_servidor: "foreign" });
    requestsMock.mockResolvedValueOnce({ items: [
      { id: "request-0", fecha_resolucion: "2026-11-08T12:00:00Z", motivo_rechazo: null },
      { id: "request-1", fecha_resolucion: "2026-11-08T12:00:00Z", motivo_rechazo: "Stock insuficiente" },
      { id: "request-2", fecha_resolucion: null },
      { id: "foreign", fecha_resolucion: "2026-11-08T12:00:00Z" },
    ] });
    expect(await refreshAwaitingApprovals("token", "org-1", "user-1")).toBe(2);
    expect((await db.pendingMovements.get(records[0].uuid_local))?.server_state).toBe("sincronizado");
    expect((await db.pendingMovements.get(records[1].uuid_local))?.status).toBe("rejected");
    expect((await db.pendingMovements.get(records[2].uuid_local))?.server_state).toBe("pendiente");
    expect((await db.pendingMovements.get(foreign.uuid_local))?.server_state).toBe("pendiente");
    expect(requestsMock.mock.calls[0][1]).not.toContain("foreign");
  });

  it("envía por orden de captura en bloques de 100, sin ordenar por UUID", async () => {
    for (let index = 0; index < 102; index++) {
      const uuid = String(102 - index).padStart(3, "0");
      await queueLocalMovement({ ...payload, uuid_local: uuid });
      await db.pendingMovements.update(uuid, { created_at: new Date(1700000000000 + index * 1000).toISOString() });
    }
    syncMock.mockImplementation(async (_token, batch) => ({ total: batch.length, sincronizados: batch.length, pendientes: 0, rechazados: 0,
      resultados: batch.map((row: {uuid_local: string}) => ({ uuid_local: row.uuid_local, estado: "sincronizado" })) }));
    expect((await syncAllPending("token", "org-1", "user-1")).sincronizados).toBe(102);
    expect(syncMock.mock.calls.map((call) => call[1].length)).toEqual([100, 2]);
    expect(syncMock.mock.calls[0][1][0].uuid_local).toBe("102");
    expect(syncMock.mock.calls[1][1][1].uuid_local).toBe("001");
  });

  it("recupera una corrección interrumpida conservando el vínculo original", async () => {
    const record = await queueLocalMovement({ ...payload, id_movimiento_original: "original-1" });
    await updateMovementStatus(record.uuid_local, "syncing");
    syncMock.mockResolvedValueOnce({ total: 1, sincronizados: 1, pendientes: 0, rechazados: 0,
      resultados: [{ uuid_local: record.uuid_local, estado: "duplicado", id_movimiento: "reversal-1" }] });
    await syncAllPending("token", "org-1", "user-1");
    expect(syncMock.mock.calls[0][1][0]).toMatchObject({ uuid_local: record.uuid_local, id_movimiento_original: "original-1" });
    expect((await db.pendingMovements.get(record.uuid_local))?.status).toBe("synced");
  });

  it("conserva los fallos parciales y las respuestas omitidas sin tocar otra cuenta", async () => {
    const records = await Promise.all(Array.from({ length: 4 }, () => queueLocalMovement(payload)));
    const foreign = await queueLocalMovement({ ...payload, userId: "user-2" });
    syncMock.mockResolvedValueOnce({ total: 4, sincronizados: 1, pendientes: 0, rechazados: 1,
      resultados: [
        { uuid_local: records[0].uuid_local, estado: "sincronizado" },
        { uuid_local: records[1].uuid_local, estado: "rechazado", motivo: "Stock insuficiente" },
        { uuid_local: records[2].uuid_local, estado: "reintentar" },
        { uuid_local: foreign.uuid_local, estado: "sincronizado" },
      ] });
    await syncAllPending("token", "org-1", "user-1");
    expect(await Promise.all(records.map(async (record) => (await db.pendingMovements.get(record.uuid_local))?.status)))
      .toEqual(["synced", "rejected", "pending", "pending"]);
    expect((await db.pendingMovements.get(foreign.uuid_local))?.status).toBe("pending");
  });

  it("usa el bloqueo por propietario y no envía mientras otra pestaña sincroniza", async () => {
    await queueLocalMovement(payload);
    const request = vi.fn(async (_name, _options, callback) => callback(null));
    vi.stubGlobal("navigator", { locks: { request } });
    expect(await syncAllPending("token", "org-1", "user-1")).toEqual({ sincronizados: 0, rechazados: 0, total: 0 });
    expect(request.mock.calls[0][0]).toBe("salmotrack-sync:org-1:user-1");
    expect(syncMock).not.toHaveBeenCalled();
    expect(await getPendingMovements("org-1", "user-1")).toHaveLength(1);
  });

  it("restituye pendientes tras un fallo de red y acepta la solicitud pendiente del servidor", async () => {
    const movement = await queueLocalMovement(payload);
    syncMock.mockRejectedValueOnce(new TypeError("sin red"));
    await expect(syncAllPending("token", "org-1", "user-1")).rejects.toThrow("sin red");
    expect((await db.pendingMovements.get(movement.uuid_local))?.status).toBe("pending");

    syncMock.mockResolvedValueOnce({
      total: 1, sincronizados: 0, pendientes: 1, rechazados: 0,
      resultados: [{ uuid_local: movement.uuid_local, estado: "pendiente", id_solicitud: "request-1" }],
    });
    expect((await syncAllPending("token", "org-1", "user-1")).sincronizados).toBe(1);
    expect((await db.pendingMovements.get(movement.uuid_local))?.id_movimiento_servidor).toBe("request-1");
    expect(await getPendingMovements("org-1", "user-1")).toHaveLength(0);
  });

  it("no envía movimientos rechazados ni operaciones de otra cuenta", async () => {
    const rejected = await queueLocalMovement(payload);
    await updateMovementStatus(rejected.uuid_local, "rejected", "Regla de capacidad");
    await queueLocalMovement({ ...payload, userId: "user-2" });
    expect(await getPendingMovements("org-1", "user-1")).toHaveLength(0);
    expect(await getPendingMovements("org-1", "user-2")).toHaveLength(1);
    expect((await getRejectedMovements("org-1", "user-1"))[0].last_error).toBe("Regla de capacidad");
  });
});

it("preserva el UUID del primer envío al pasar a offline", async () => {
  const record = await queueLocalMovement({...payload, uuid_local: "same-operation"});
  expect(record.uuid_local).toBe("same-operation");
});
it("conserva en cola los fallos transitorios del servidor", async () => {
  await db.pendingMovements.clear();
  const record = await queueLocalMovement(payload);
  syncMock.mockResolvedValueOnce({total:1,sincronizados:0,pendientes:0,rechazados:0,
    resultados:[{uuid_local:record.uuid_local,estado:"reintentar",motivo:"Servicio ocupado"}]});
  await syncAllPending("token","org-1","user-1");
  expect((await db.pendingMovements.get(record.uuid_local))?.status).toBe("pending");
});
