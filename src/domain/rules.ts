export interface LocationRule {
  id: string;
  id_organizacion: string;
  id_ubicacion?: string | null;
  id_zona?: string | null;
  tipo_regla: "capacidad_maxima" | "categoria_permitida" | "temperatura" | "cuarentena" | string;
  parametros: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
}
