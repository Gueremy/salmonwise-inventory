import { OrganizationConfig, DEFAULT_THRESHOLDS, DEFAULT_THEME } from "./organization";

export type LocationStatus = "disponible" | "medio" | "critico" | "mantenimiento" | "cuarentena" | string;

export interface LocationCoordinates {
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  rotation?: number;
  posicion_fila?: number;
  posicion_col?: number;
  [key: string]: unknown;
}

export interface Location {
  id: string;
  id_organizacion: string;
  id_zona: string;
  codigo: string;
  capacidad_maxima: number;
  unidad_capacidad: string;
  ocupacion_actual: number;
  permite_mezcla_lotes: boolean;
  estado: LocationStatus;
  layout: LocationCoordinates;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
  // Metadata calculada
  porcentaje_ocupacion?: number;
  item_principal?: string | null;
  lote_principal?: string | null;
}

/**
 * Resuelve el estado visual y color de una ubicación utilizando
 * la configuración dinámica de la organización.
 */
export function resolveLocationVisualState(
  location: { ocupacion_actual: number; capacidad_maxima: number; estado?: string },
  config?: OrganizationConfig,
): { estado: LocationStatus; color: string; porcentaje: number } {
  const cap = Number(location.capacidad_maxima) || 0;
  const actual = Number(location.ocupacion_actual) || 0;
  const porcentaje = cap > 0 ? Math.round((actual / cap) * 100) : 0;

  const umbrales = config?.umbrales ?? DEFAULT_THRESHOLDS;
  const colores = config?.colores ?? DEFAULT_THEME;

  // Si tiene un estado especial administrativo (ej: mantenimiento, cuarentena)
  if (location.estado === "mantenimiento") {
    return { estado: "mantenimiento", color: colores.color_mantenimiento, porcentaje };
  }
  if (location.estado === "cuarentena") {
    return { estado: "cuarentena", color: colores.color_cuarentena, porcentaje };
  }

  if (porcentaje <= umbrales.disponible_max) {
    return { estado: "disponible", color: colores.color_disponible, porcentaje };
  }
  if (porcentaje <= umbrales.medio_max) {
    return { estado: "medio", color: colores.color_medio, porcentaje };
  }
  return { estado: "critico", color: colores.color_critico, porcentaje };
}
