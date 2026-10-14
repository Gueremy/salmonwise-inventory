import { apiFetch } from "./client";
import { CreateMovementPayload, Movement, MovementTypeConfig } from "../domain/movement";
import { PaginatedResponse } from "./sites";

export interface MovementRequest extends CreateMovementPayload {
  id: string;
  id_organizacion: string;
  id_usuario_solicitante: string;
  id_usuario_aprobador: string | null;
  estado: string;
  motivo_rechazo: string | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
}

export interface SyncMovimientoItem {
  uuid_local: string;
  id_tipo_movimiento: string;
  id_item: string;
  id_lote?: string | null;
  id_ubicacion_origen?: string | null;
  id_ubicacion_destino?: string | null;
  cantidad: number;
  unidad_medida: string;
  fecha_hora_local?: string;
  observaciones?: string | null;
  atributos?: Record<string, unknown>;
}

export interface SyncBatchResponse {
  total: number;
  sincronizados: number;
  pendientes: number;
  rechazados: number;
  resultados: Array<{
    uuid_local: string;
    estado: "sincronizado" | "duplicado" | "pendiente" | "rechazado";
    id_movimiento?: string | null;
    id_solicitud?: string | null;
    motivo?: string | null;
  }>;
}

export async function fetchMovementTypes(token: string): Promise<MovementTypeConfig[]> {
  return apiFetch<MovementTypeConfig[]>("/api/v2/movimientos/tipos", { token });
}

export async function fetchMovements(token: string, query = ""): Promise<PaginatedResponse<Movement>> {
  const suffix = query ? `?${query}` : "";
  return apiFetch<PaginatedResponse<Movement>>(`/api/v2/movimientos/${suffix}`, { token });
}

export async function fetchMovementRequests(token: string, query = ""): Promise<PaginatedResponse<MovementRequest>> {
  const suffix = query ? `?${query}` : "";
  return apiFetch<PaginatedResponse<MovementRequest>>(`/api/v2/movimientos/solicitudes${suffix}`, { token });
}

export async function createMovement(token: string, payload: CreateMovementPayload): Promise<MovementRequest> {
  return apiFetch<MovementRequest>("/api/v2/movimientos/solicitudes", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function approveMovement(token: string, id: string): Promise<Movement | MovementRequest> {
  return apiFetch<Movement | MovementRequest>(`/api/v2/movimientos/solicitudes/${id}/aprobar`, {
    method: "PATCH",
    token,
  });
}

export async function rejectMovement(token: string, id: string, motivo: string): Promise<MovementRequest> {
  return apiFetch<MovementRequest>(`/api/v2/movimientos/solicitudes/${id}/rechazar`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ motivo }),
  });
}

export async function syncOfflineMovements(token: string, movimientos: SyncMovimientoItem[]): Promise<SyncBatchResponse> {
  return apiFetch<SyncBatchResponse>("/api/v2/movimientos/sync", {
    method: "POST",
    token,
    body: JSON.stringify({ movimientos }),
  });
}
