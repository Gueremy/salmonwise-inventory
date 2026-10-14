import { db } from "./db";
import { getPendingMovements, updateMovementStatus } from "./movementQueue";
import { syncOfflineMovements, SyncMovimientoItem } from "@/api/movements";

export interface SyncEngineStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  totalSynced: number;
  totalRejected: number;
}

let isSyncingProcess = false;

export async function syncAllPending(
  token: string,
  orgId: string,
  userId: string,
): Promise<{ sincronizados: number; rechazados: number; total: number }> {
  if (isSyncingProcess) {
    return { sincronizados: 0, rechazados: 0, total: 0 };
  }

  isSyncingProcess = true;
  try {
    const pendings = await getPendingMovements(orgId, userId);
    if (pendings.length === 0) {
      return { sincronizados: 0, rechazados: 0, total: 0 };
    }

    const totals = { sincronizados: 0, rechazados: 0, total: 0 };
    for (let start = 0; start < pendings.length; start += 100) {
      const batch = pendings.slice(start, start + 100);
      const payloadItems: SyncMovimientoItem[] = batch.map((movement) => ({
        uuid_local: movement.uuid_local,
        id_tipo_movimiento: movement.id_tipo_movimiento,
        id_item: movement.id_item,
        id_lote: movement.id_lote,
        id_ubicacion_origen: movement.id_ubicacion_origen,
        id_ubicacion_destino: movement.id_ubicacion_destino,
        cantidad: movement.cantidad,
        unidad_medida: movement.unidad_medida,
        fecha_hora_local: movement.fecha_hora_local,
        observaciones: movement.observaciones,
        atributos: movement.atributos,
      }));
      await Promise.all(batch.map((movement) => db.pendingMovements.update(movement.uuid_local, { status: "syncing" })));
      let response;
      try {
        response = await syncOfflineMovements(token, payloadItems);
      } catch (error) {
        await Promise.all(batch.map((movement) => updateMovementStatus(movement.uuid_local, "pending")));
        throw error;
      }
      for (const result of response.resultados) {
        if (result.estado === "sincronizado" || result.estado === "duplicado" || result.estado === "pendiente") {
          await updateMovementStatus(result.uuid_local, "synced", null, result.id_movimiento ?? result.id_solicitud);
        } else {
          await updateMovementStatus(result.uuid_local, "rejected", result.motivo);
        }
        await db.syncLog.add({
          uuid_local: result.uuid_local,
          fecha_hora: new Date().toISOString(),
          estado: result.estado,
          mensaje: result.motivo ?? "Movimiento recibido por el servidor",
        });
      }
      const answered = new Set(response.resultados.map((result) => result.uuid_local));
      await Promise.all(batch.filter((movement) => !answered.has(movement.uuid_local))
        .map((movement) => updateMovementStatus(movement.uuid_local, "pending")));
      totals.sincronizados += response.sincronizados + response.pendientes;
      totals.rechazados += response.rechazados;
      totals.total += response.total;
    }
    return totals;
  } finally {
    isSyncingProcess = false;
  }
}
