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
  orgId?: string,
): Promise<{ sincronizados: number; rechazados: number; total: number }> {
  if (isSyncingProcess) {
    return { sincronizados: 0, rechazados: 0, total: 0 };
  }

  isSyncingProcess = true;
  try {
    const pendings = await getPendingMovements(orgId);
    if (pendings.length === 0) {
      return { sincronizados: 0, rechazados: 0, total: 0 };
    }

    // Convertir al contrato del backend SyncMovimientoItem
    const payloadItems: SyncMovimientoItem[] = pendings.map((p) => ({
      uuid_local: p.uuid_local,
      id_tipo_movimiento: p.id_tipo_movimiento,
      id_item: p.id_item,
      id_lote: p.id_lote,
      id_ubicacion_origen: p.id_ubicacion_origen,
      id_ubicacion_destino: p.id_ubicacion_destino,
      cantidad: p.cantidad,
      unidad_medida: p.unidad_medida,
      fecha_hora_local: p.fecha_hora_local,
      observaciones: p.observaciones,
      atributos: p.atributos,
    }));

    // Marcar como 'syncing'
    await Promise.all(
      pendings.map((p) => db.pendingMovements.update(p.uuid_local, { status: "syncing" })),
    );

    const response = await syncOfflineMovements(token, payloadItems);

    for (const res of response.resultados) {
      if (res.estado === "sincronizado" || res.estado === "duplicado") {
        await updateMovementStatus(res.uuid_local, "synced", null, res.id_movimiento);
        await db.syncLog.add({
          uuid_local: res.uuid_local,
          fecha_hora: new Date().toISOString(),
          estado: res.estado,
          mensaje: "Movimiento procesado correctamente en servidor",
        });
      } else {
        await updateMovementStatus(res.uuid_local, "rejected", res.motivo);
        await db.syncLog.add({
          uuid_local: res.uuid_local,
          fecha_hora: new Date().toISOString(),
          estado: "rechazado",
          mensaje: res.motivo,
        });
      }
    }

    return {
      sincronizados: response.sincronizados,
      rechazados: response.rechazados,
      total: response.total,
    };
  } finally {
    isSyncingProcess = false;
  }
}
