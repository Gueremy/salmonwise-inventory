import { db } from "./db";
import { getPendingMovements, updateMovementStatus } from "./movementQueue";
import { fetchMovementRequests, syncOfflineMovements, SyncMovimientoItem } from "@/api/movements";

export interface SyncEngineStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  totalSynced: number;
  totalRejected: number;
}

let isSyncingProcess = false;

async function runSync(
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
        id_movimiento_original: movement.id_movimiento_original,
        lote_nuevo: movement.lote_nuevo,
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
        if (!batch.some((movement) => movement.uuid_local === result.uuid_local)) continue;
        await db.pendingMovements.update(result.uuid_local, { server_state: result.estado });
        if (result.estado === "sincronizado" || result.estado === "duplicado" || result.estado === "pendiente") {
          await updateMovementStatus(result.uuid_local, "synced", null, result.id_movimiento ?? result.id_solicitud);
        } else if (result.estado === "reintentar") {
          await updateMovementStatus(result.uuid_local, "pending", result.motivo);
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

export async function syncAllPending(token: string, orgId: string, userId: string) {
  if (navigator.locks) {
    return navigator.locks.request(`salmotrack-sync:${orgId}:${userId}`, { ifAvailable: true }, async (lock) => {
      if (!lock) return { sincronizados: 0, rechazados: 0, total: 0 };
      return runSync(token, orgId, userId);
    });
  }
  // Backend UUID deduplication also protects browsers without Web Locks.
  return runSync(token, orgId, userId);
}

export async function refreshAwaitingApprovals(token: string, orgId: string, userId: string): Promise<number> {
  const awaiting = await db.pendingMovements.where("organization_id").equals(orgId)
    .and((row) => row.user_id === userId && row.status === "synced" && row.server_state === "pendiente").toArray();
  let changed = 0;
  for (let start = 0; start < awaiting.length; start += 100) {
    const batch = awaiting.slice(start, start + 100);
    const params = new URLSearchParams({ size: "100" });
    for (const row of batch) if (row.id_movimiento_servidor) params.append("ids", row.id_movimiento_servidor);
    if (!params.has("ids")) continue;
    const response = await fetchMovementRequests(token, params.toString());
    for (const request of response.items) {
      const local = batch.find((row) => row.id_movimiento_servidor === request.id);
      if (!local || !request.fecha_resolucion) continue;
      const rejected = request.motivo_rechazo != null;
      await db.pendingMovements.update(local.uuid_local, {
        server_state: rejected ? "rechazado" : "sincronizado", status: rejected ? "rejected" : "synced",
        last_error: rejected ? request.motivo_rechazo : null,
      });
      changed++;
    }
  }
  return changed;
}
