export interface Site {
  id: string;
  id_organizacion: string;
  codigo: string;
  nombre: string;
  tipo: string; // ej: "planta", "bodega", "embarcacion", "centro_distribucion", etc.
  descripcion?: string | null;
  ubicacion_geografica?: string | null;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
  // Métricas calculadas o agregadas
  ocupacion_promedio?: number;
  total_zonas?: number;
  alertas_activas?: number;
}
