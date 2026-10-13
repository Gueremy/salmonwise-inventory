export interface ZoneLayout {
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: number;
  filas?: number;
  columnas?: number;
  spacing?: number;
  [key: string]: unknown;
}

export interface Zone {
  id: string;
  id_organizacion: string;
  id_sitio: string;
  id_zona_padre?: string | null;
  codigo: string;
  nombre: string;
  tipo: string; // ej: "galpon", "pasillo", "nivel", "sala_frio", etc.
  layout: ZoneLayout;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
  // Agregados
  ocupacion_promedio?: number;
  total_ubicaciones?: number;
}

export interface ZoneTreeNode extends Zone {
  hijos: ZoneTreeNode[];
}
