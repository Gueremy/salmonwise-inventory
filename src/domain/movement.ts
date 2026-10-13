export interface MovementTypeConfig {
  id: string;
  codigo: string;
  nombre: string;
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

export interface Movement {
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
  item_nombre?: string;
  ubicacion_origen_codigo?: string;
  ubicacion_destino_codigo?: string;
  usuario_nombre?: string;
}

export interface CreateMovementPayload {
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
