import { apiFetch } from "./client";
import { CreateMovementPayload, Movement, MovementTypeConfig } from "../domain/movement";
import { PaginatedResponse } from "./sites";
import type { ApiMovimientoListItem } from "@/lib/api";

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
  rechazados: number;
  resultados: Array<{
    uuid_local: string;
    estado: "sincronizado" | "duplicado" | "rechazado";
    id_movimiento?: string | null;
    motivo?: string | null;
  }>;
}

export async function fetchMovementTypes(token: string): Promise<MovementTypeConfig[]> {
  try {
    return await apiFetch<MovementTypeConfig[]>("/api/v2/movimientos/tipos", { token });
  } catch {
    // Tipos por defecto si no están definidos aún
    return [
      {
        id: "entrada_proveedor",
        codigo: "ENT_PROV",
        nombre: "Entrada de Proveedor",
        requiere_origen: false,
        requiere_destino: true,
        requiere_aprobacion: true,
        descripcion: "Recepción externa de insumos a una ubicación",
      },
      {
        id: "salida_produccion",
        codigo: "SAL_PROD",
        nombre: "Salida a Producción",
        requiere_origen: true,
        requiere_destino: false,
        requiere_aprobacion: false,
        descripcion: "Consumo o despacho desde una ubicación",
      },
      {
        id: "traslado_interno",
        codigo: "TRAS_INT",
        nombre: "Traslado Interno",
        requiere_origen: true,
        requiere_destino: true,
        requiere_aprobacion: false,
        descripcion: "Reubicación de stock entre ubicaciones",
      },
    ];
  }
}

export async function fetchMovements(token: string, query = ""): Promise<PaginatedResponse<Movement>> {
  const suffix = query ? `?${query}` : "";
  try {
    return await apiFetch<PaginatedResponse<Movement>>(`/api/v2/movimientos${suffix}`, { token });
  } catch {
    // Adaptador legacy /movimientos/
    const legacy = await apiFetch<PaginatedResponse<ApiMovimientoListItem>>(`/movimientos/${suffix}`, { token });
    return {
      items: legacy.items.map((m) => ({
        id: m.id,
        id_organizacion: "default",
        id_tipo_movimiento: m.tipo,
        id_item: m.id_producto,
        id_lote: m.numero_lote,
        id_ubicacion_origen: m.id_container,
        id_ubicacion_destino: m.id_container_destino,
        id_usuario: m.id_usuario,
        id_usuario_aprobador: m.id_usuario_aprobador,
        cantidad: Number(m.cantidad),
        unidad_medida: "unidades",
        estado: m.estado,
        fecha_hora: m.fecha_hora,
        fecha_aprobacion: m.fecha_aprobacion,
        motivo_rechazo: m.motivo_rechazo,
        observaciones: m.observaciones,
        atributos: {},
        item_nombre: m.producto_nombre,
        ubicacion_origen_codigo: m.container_codigo,
        ubicacion_destino_codigo: m.container_destino_codigo,
        usuario_nombre: m.operario_nombre,
      })),
      total: legacy.total,
      page: legacy.page,
      size: legacy.size,
      pages: legacy.pages,
    };
  }
}

export async function createMovement(token: string, payload: CreateMovementPayload): Promise<Movement> {
  return apiFetch<Movement>("/api/v2/movimientos", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function approveMovement(token: string, id: string): Promise<Movement> {
  return apiFetch<Movement>(`/api/v2/movimientos/${id}/aprobar`, {
    method: "POST",
    token,
  });
}

export async function rejectMovement(token: string, id: string, motivo: string): Promise<Movement> {
  return apiFetch<Movement>(`/api/v2/movimientos/${id}/rechazar`, {
    method: "POST",
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
