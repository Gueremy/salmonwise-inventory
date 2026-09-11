import { afterEach, describe, expect, it } from "vitest";
import { applySyncResults, db, type MovimientoOffline } from "@/lib/db";

const payload: MovimientoOffline["payload"] = {
  id_container: "container",
  id_producto: "producto",
  tipo: "salida_produccion",
  cantidad: 1,
  numero_lote: "E2E-PREVIEW-UNIT",
  fecha_vencimiento: "2027-01-01T00:00:00",
};

describe("offline sync results", () => {
  afterEach(async () => {
    await db.movimientos_offline.clear();
  });

  it("keeps partial applied and rejected results separately", async () => {
    await db.movimientos_offline.bulkAdd([
      { uuid_local: "one", payload, status: "pending", created_at: 1, intentos: 1 },
      { uuid_local: "two", payload, status: "pending", created_at: 2, intentos: 1 },
    ]);

    await applySyncResults(["one", "two"], [
      { uuid_local: "one", accion: "aplicar", motivo: "ok", id_movimiento: "server-id" },
      { uuid_local: "two", accion: "rechazar", motivo: "Stock insuficiente" },
    ]);

    expect((await db.movimientos_offline.get("one"))?.status).toBe("synced");
    expect((await db.movimientos_offline.get("two"))).toMatchObject({
      status: "rejected",
      last_error: "Stock insuficiente",
    });
  });
});
