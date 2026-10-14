import { db, LocalMovementRecord } from "./db";

export async function queueLocalMovement(
  payload: {
    organizationId: string;
    userId?: string;
    id_tipo_movimiento: string;
    id_item: string;
    id_lote?: string | null;
    id_ubicacion_origen?: string | null;
    id_ubicacion_destino?: string | null;
    cantidad: number;
    unidad_medida: string;
    observaciones?: string | null;
    atributos?: Record<string, unknown>;
  },
): Promise<LocalMovementRecord> {
  const uuid_local = crypto.randomUUID();
  const record: LocalMovementRecord = {
    uuid_local,
    organization_id: payload.organizationId,
    user_id: payload.userId,
    id_tipo_movimiento: payload.id_tipo_movimiento,
    id_item: payload.id_item,
    id_lote: payload.id_lote,
    id_ubicacion_origen: payload.id_ubicacion_origen,
    id_ubicacion_destino: payload.id_ubicacion_destino,
    cantidad: payload.cantidad,
    unidad_medida: payload.unidad_medida,
    fecha_hora_local: new Date().toISOString(),
    observaciones: payload.observaciones,
    atributos: payload.atributos ?? {},
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
  };

  await db.pendingMovements.put(record);
  return record;
}

export async function getPendingMovements(orgId: string, userId?: string): Promise<LocalMovementRecord[]> {
  return db.pendingMovements.where("organization_id").equals(orgId)
    .and((movement) => (!userId || movement.user_id === userId)
      && (movement.status === "pending" || movement.status === "syncing"))
    .toArray();
}

export async function getPendingMovementsCount(orgId: string, userId?: string): Promise<number> {
  return (await getPendingMovements(orgId, userId)).length;
}

export async function getRejectedMovements(orgId: string, userId: string): Promise<LocalMovementRecord[]> {
  return db.pendingMovements.where("organization_id").equals(orgId)
    .and((movement) => movement.user_id === userId && movement.status === "rejected")
    .toArray();
}

export async function updateMovementStatus(
  uuid_local: string,
  status: LocalMovementRecord["status"],
  errorMsg?: string | null,
  serverId?: string | null,
): Promise<void> {
  await db.pendingMovements.update(uuid_local, {
    status,
    last_error: errorMsg,
    id_movimiento_servidor: serverId,
  });
}
