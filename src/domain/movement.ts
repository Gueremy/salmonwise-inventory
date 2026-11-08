export interface Supplier { rut: string; razon_social: string }
export interface NewLot { numero_lote: string; fecha_fabricacion?: string | null; fecha_vencimiento?: string | null; proveedor: Supplier }
export interface MovementPresentation {
  efecto_stock?: string | null;
  item_nombre?: string | null;
  item_codigo?: string | null;
  numero_lote?: string | null;
  fecha_vencimiento?: string | null;
  tipo_codigo?: string | null;
  tipo_nombre?: string | null;
  ubicacion_origen_codigo?: string | null;
  ubicacion_destino_codigo?: string | null;
  usuario_nombre?: string | null;
  aprobador_nombre?: string | null;
}

export interface MovementTypeConfig {
  id: string;
  id_organizacion: string;
  codigo: string;
  nombre: string;
  efecto_stock: "entrada" | "salida" | "traslado" | "sin_efecto";
  requiere_origen: boolean;
  requiere_destino: boolean;
  requiere_aprobacion: boolean;
  descripcion?: string;
  campos_adicionales?: Array<{
    nombre: string;
    label: string;
    tipo: "text" | "number" | "date" | "boolean" | "select";
    requerido: boolean;
    opciones?: string[];
  }>;
}

export type MovementStatus = "pendiente" | "aprobado" | "rechazado";

export interface Movement extends MovementPresentation {
  id: string;
  id_organizacion: string;
  id_tipo_movimiento: string;
  id_item: string;
  id_lote?: string | null;
  id_ubicacion_origen?: string | null;
  id_ubicacion_destino?: string | null;
  id_usuario: string;
  id_usuario_aprobador?: string | null;
  cantidad: number;
  unidad_medida: string;
  estado: MovementStatus;
  fecha_hora: string;
  fecha_aprobacion?: string | null;
  motivo_rechazo?: string | null;
  observaciones?: string | null;
  atributos: Record<string, unknown>;
  // Presentación / Joins

}

export interface CreateMovementPayload {
  id_movimiento_original?: string;
  lote_nuevo?: NewLot;
  fecha_hora_local?: string;
  uuid_local?: string;
  id_tipo_movimiento: string;
  id_item: string;
  id_lote?: string | null;
  id_ubicacion_origen?: string | null;
  id_ubicacion_destino?: string | null;
  cantidad: number;
  unidad_medida: string;
  observaciones?: string | null;
  atributos?: Record<string, unknown>;
}
