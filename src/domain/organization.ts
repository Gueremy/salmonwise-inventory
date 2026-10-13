export interface ThresholdConfig {
  disponible_max: number; // Por defecto 40%
  medio_max: number;      // Por defecto 79%
  critico_min: number;    // Por defecto 80%
}

export interface OrganizationThemeConfig {
  color_disponible: string;
  color_medio: string;
  color_critico: string;
  color_mantenimiento: string;
  color_cuarentena: string;
}

export interface OrganizationConfig {
  umbrales?: ThresholdConfig;
  colores?: OrganizationThemeConfig;
  unidades_permitidas?: string[];
  estrategia_picking_default?: "FEFO" | "FIFO" | "LIFO";
  permite_mezcla_lotes_default?: boolean;
}

export interface Organization {
  id: string;
  codigo: string;
  nombre: string;
  configuracion: OrganizationConfig;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  disponible_max: 40,
  medio_max: 79,
  critico_min: 80,
};

export const DEFAULT_THEME: OrganizationThemeConfig = {
  color_disponible: "#22C55E",
  color_medio: "#EAB308",
  color_critico: "#EF4444",
  color_mantenimiento: "#9CA3AF",
  color_cuarentena: "#8B5CF6",
};
