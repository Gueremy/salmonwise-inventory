import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../offline/db";
import { queueLocalMovement, getPendingMovements, updateMovementStatus } from "../offline/movementQueue";

describe("Offline Movement Queue (Dexie.js)", () => {
  beforeEach(async () => {
    await db.pendingMovements.clear();
    await db.syncLog.clear();
  });

  it("queues a new movement offline with unique uuid and pending status", async () => {
    const record = await queueLocalMovement({
      organizationId: "org-1",
      userId: "user-1",
      id_tipo_movimiento: "entrada_proveedor",
      id_item: "item-1",
      id_ubicacion_destino: "loc-1",
      cantidad: 50,
      unidad_medida: "kg",
      atributos: { nota: "test offline" },
    });

    expect(record.uuid_local).toBeDefined();
    expect(record.status).toBe("pending");
    expect(record.cantidad).toBe(50);

    const pendings = await getPendingMovements("org-1");
    expect(pendings).toHaveLength(1);
    expect(pendings[0].uuid_local).toBe(record.uuid_local);
  });

  it("updates movement status properly on successful sync or rejection", async () => {
    const record = await queueLocalMovement({
      organizationId: "org-1",
      id_tipo_movimiento: "salida_produccion",
      id_item: "item-2",
      id_ubicacion_origen: "loc-2",
      cantidad: 10,
      unidad_medida: "unidades",
    });

    await updateMovementStatus(record.uuid_local, "synced", null, "server-mov-123");
    const updated = await db.pendingMovements.get(record.uuid_local);

    expect(updated?.status).toBe("synced");
    expect(updated?.id_movimiento_servidor).toBe("server-mov-123");

    // Ya no debe aparecer en pendientes activos
    const pendings = await getPendingMovements("org-1");
    expect(pendings).toHaveLength(0);
  });
});
