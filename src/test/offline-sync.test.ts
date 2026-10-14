import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/offline/db";
import { getPendingMovements, getRejectedMovements, queueLocalMovement, updateMovementStatus } from "@/offline/movementQueue";

const syncMock = vi.hoisted(() => vi.fn());
vi.mock("@/api/movements", () => ({ syncOfflineMovements: syncMock }));
import { syncAllPending } from "@/offline/syncEngine";

const payload = {
  organizationId: "org-1", userId: "user-1", id_tipo_movimiento: "type-1",
  id_item: "item-1", id_ubicacion_destino: "loc-1", cantidad: 2, unidad_medida: "kg",
};

describe("sincronización offline", () => {
  beforeEach(async () => {
    syncMock.mockReset();
    await db.pendingMovements.clear();
    await db.syncLog.clear();
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
