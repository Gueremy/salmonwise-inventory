export type EstadoContainer = 'disponible' | 'medio' | 'critico' | 'mantenimiento' | 'cuarentena';
export type TipoSede = 'ponton' | 'planta' | 'bodega' | 'embarcacion';
export type Rol = 'jefe_bodega' | 'admin_sede' | 'operario' | 'gerencia' | 'super_admin';
export type TipoMovimiento = 'entrada_proveedor' | 'salida_produccion' | 'traslado_interno';
export type EstadoMovimiento = 'pendiente' | 'aprobado' | 'rechazado';

/** Wrapper de paginación que usa el backend en todos los endpoints de lista */
export interface Paginated<T> {
  items: T[];
  total: number;
}

// --- API types (backend — matches real response shapes) ---

export interface SedeAPI {
  id: string;
  nombre: string;
  tipo: TipoSede;
  ubicacion: string;
  latitud?: number | null;
  longitud?: number | null;
  capacidad_total?: number | null;
  estado: 'activo' | 'inactivo';
}

export interface GalponAPI {
  id: string;
  nombre: string;
  codigo: string;
  id_sede: string;
  capacidad_total?: number | null;
  ocupacion_actual?: number | null;
  estado?: string;
  filas: number;
  columnas: number;
}

export interface ContainerAPI {
  id: string;
  codigo: string;
  id_galpon: string;
  estado: EstadoContainer;
  capacidad_max: number;
  ocupacion_actual: number;
  producto?: string;
  nombre_producto?: string;
  numero_lote?: string;
  fecha_vencimiento?: string;
  temperatura_almacen?: number;
}

export interface MovimientoAPI {
  id: string;
  tipo: TipoMovimiento;
  estado: EstadoMovimiento;
  id_container: string;
  codigo_container?: string;
  id_producto?: string;
  nombre_producto?: string;
  cantidad: number;
  unidad: string;
  numero_lote?: string;
  fecha_vencimiento?: string;
  nombre_proveedor?: string;
  num_guia_despacho?: string;
  registro_sanitario?: string;
  temperatura_almacen?: number;
  observaciones?: string;
  codigo_empleado_creador: string;
  created_at: string;
  aprobado_por?: string;
  motivo_rechazo?: string;
}

export interface UsuarioAPI {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  codigo_empleado: string;
  id_sede: string | null;
  sede_nombre: string | null;
  activo: boolean;
  galpon_ids?: string[];
}

export interface ContainerQR {
  qr_base64: string;
  codigo: string;
}

export interface ContainerPublicInfo {
  id: string;
  codigo: string;
  estado: EstadoContainer;
  nombre_producto?: string;
  numero_lote?: string;
  fecha_vencimiento?: string;
}

// --- Legacy local types (kept for compatibility) ---

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
  tipo: TipoMovimiento;
  operario: string;
  galpon: string;
  hora: string;
  lote: string;
  estado: EstadoMovimiento;
}

export const rolLabel: Record<Rol, string> = {
  jefe_bodega: 'Jefe de Bodega',
  admin_sede:  'Admin Sede',
  operario:    'Operario',
  gerencia:    'Gerencia',
  super_admin: 'Super Admin',
};

export const tipoMovimientoLabel: Record<TipoMovimiento, string> = {
  entrada_proveedor: 'Entrada de proveedor',
  salida_produccion: 'Salida a producción',
  traslado_interno:  'Traslado interno',
};

export const estadoMovimientoLabel: Record<EstadoMovimiento, string> = {
  pendiente:  'Pendiente',
  aprobado:   'Aprobado',
  rechazado:  'Rechazado',
};

export const estadoColor: Record<EstadoContainer, string> = {
  disponible:    'var(--color-status-disponible)',
  medio:         'var(--color-status-medio)',
  critico:       'var(--color-status-critico)',
  mantenimiento: 'var(--color-status-mantenimiento)',
  cuarentena:    'var(--color-status-cuarentena)',
};

export const estadoColorHex: Record<EstadoContainer, string> = {
  disponible:    '#15803D',
  medio:         '#B45309',
  critico:       '#DC2626',
  mantenimiento: '#4B5563',
  cuarentena:    '#7C3AED',
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

export const porcentajeOcupacion = (actual: number, max: number): number => {
  if (!max) return 0;
  return Math.round((actual / max) * 100);
};
