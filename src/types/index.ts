export type EstadoContainer = 'disponible' | 'medio' | 'critico' | 'mantenimiento' | 'cuarentena';
export type TipoSede = 'embarcacion' | 'planta' | 'bodega';
export type Rol = 'jefe_bodega' | 'admin_sede' | 'operario' | 'gerencia' | 'super_admin';

export interface Sede {
  id: string;
  nombre: string;
  tipo: TipoSede;
  ocupacion: number;
  alertas: number;
  movimientosHoy?: number;
}

export interface Galpon {
  id: string;
  codigo: string;
  nombre: string;
  containers: number;
  ocupacion_prom: number;
  sedeId: string;
}

export interface Container {
  id: string;
  codigo: string;
  ocupacion: number;
  estado: EstadoContainer;
  producto: string | null;
  lote: string | null;
  vencimiento: string | null;
  galponId: string;
}

export interface Movimiento {
  id: string;
  producto: string;
  tipo: 'entrada_proveedor' | 'salida_produccion' | 'traslado_interno';
  operario: string;
  galpon: string;
  hora: string;
  lote: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export const rolLabel: Record<Rol, string> = {
  jefe_bodega: 'Jefe de Bodega',
  admin_sede:  'Admin Sede',
  operario:    'Operario',
  gerencia:    'Gerencia',
  super_admin: 'Super Admin',
};

export const estadoColor: Record<EstadoContainer, string> = {
  disponible:    '#22C55E',
  medio:         '#EAB308',
  critico:       '#EF4444',
  mantenimiento: '#9CA3AF',
  cuarentena:    '#8B5CF6',
};

export const estadoLabel: Record<EstadoContainer, string> = {
  disponible:    'Disponible',
  medio:         'Medio',
  critico:       'Crítico',
  mantenimiento: 'Mantenimiento',
  cuarentena:    'Cuarentena',
};

export const ocupacionToEstado = (o: number): EstadoContainer => {
  if (o < 41) return 'disponible';
  if (o < 80) return 'medio';
  return 'critico';
};
