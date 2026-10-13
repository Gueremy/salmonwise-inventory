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

export async function getPendingMovements(orgId?: string): Promise<LocalMovementRecord[]> {
  if (orgId) {
    return db.pendingMovements
      .where("organization_id")
      .equals(orgId)
      .and((m) => m.status === "pending" || m.status === "rejected")
      .toArray();
  }
  return db.pendingMovements
    .where("status")
    .equals("pending")
    .toArray();
}

export async function getPendingMovementsCount(): Promise<number> {
  return db.pendingMovements
    .where("status")
    .equals("pending")
    .count();
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
