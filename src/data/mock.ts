// Tipos y constantes → src/types/index.ts
export type { EstadoContainer, TipoSede, Rol, Sede, Galpon, Container, Movimiento } from '@/types';
export { rolLabel, estadoColor, estadoLabel, ocupacionToEstado } from '@/types';

// ---- Datos mock — se eliminan sprint a sprint conforme se conectan APIs reales ----

import type { Sede, Galpon, Container, Movimiento, EstadoContainer } from '@/types';

export const sedes: Sede[] = [
  { id: 's1', nombre: 'Pontón Los Ángeles',   tipo: 'embarcacion', ocupacion: 72, alertas: 1, movimientosHoy: 4  },
  { id: 's2', nombre: 'Planta Puerto Montt',  tipo: 'planta',      ocupacion: 45, alertas: 0, movimientosHoy: 12 },
  { id: 's3', nombre: 'Bodega Central',       tipo: 'bodega',      ocupacion: 88, alertas: 3, movimientosHoy: 6  },
  { id: 's4', nombre: 'Pontón Bahía Sur',     tipo: 'embarcacion', ocupacion: 31, alertas: 0, movimientosHoy: 2  },
];

export const galpones: Galpon[] = [
  { id: 'g1', codigo: 'G1', nombre: 'Alimentos',          containers: 20, ocupacion_prom: 58, sedeId: 's2' },
  { id: 'g2', codigo: 'G2', nombre: 'Químicos',           containers: 12, ocupacion_prom: 81, sedeId: 's2' },
  { id: 'g3', codigo: 'G3', nombre: 'Veterinarios',       containers: 8,  ocupacion_prom: 34, sedeId: 's2' },
  { id: 'g4', codigo: 'G1', nombre: 'Alimentos',          containers: 12, ocupacion_prom: 72, sedeId: 's1' },
  { id: 'g5', codigo: 'G2', nombre: 'Veterinarios',       containers: 6,  ocupacion_prom: 65, sedeId: 's1' },
  { id: 'g6', codigo: 'G1', nombre: 'Insumos Generales',  containers: 24, ocupacion_prom: 88, sedeId: 's3' },
  { id: 'g7', codigo: 'G2', nombre: 'Químicos',           containers: 16, ocupacion_prom: 90, sedeId: 's3' },
  { id: 'g8', codigo: 'G1', nombre: 'Alimentos',          containers: 12, ocupacion_prom: 31, sedeId: 's4' },
];

const estadoFromOcup = (ocup: number): EstadoContainer => {
  if (ocup === 0) return 'disponible';
  if (ocup < 41)  return 'disponible';
  if (ocup < 80)  return 'medio';
  return 'critico';
};

const baseG1: Container[] = [
  { id: 'c01', codigo: 'G1-C01', ocupacion: 20, estado: 'disponible',    producto: 'Alimento Skretting 5mm', lote: 'LOT-2026-04-001', vencimiento: '2026-08-15', galponId: 'g1' },
  { id: 'c02', codigo: 'G1-C02', ocupacion: 65, estado: 'medio',         producto: 'Alimento 3mm',           lote: 'LOT-2026-04-023', vencimiento: '2026-07-20', galponId: 'g1' },
  { id: 'c03', codigo: 'G1-C03', ocupacion: 92, estado: 'critico',       producto: 'Alimento 8mm',           lote: 'LOT-2026-03-089', vencimiento: '2026-05-30', galponId: 'g1' },
  { id: 'c04', codigo: 'G1-C04', ocupacion: 0,  estado: 'mantenimiento', producto: null,                     lote: null,              vencimiento: null,          galponId: 'g1' },
  { id: 'c05', codigo: 'G1-C05', ocupacion: 45, estado: 'medio',         producto: 'Alimento 5mm',           lote: 'LOT-2026-04-045', vencimiento: '2026-09-10', galponId: 'g1' },
  { id: 'c06', codigo: 'G1-C06', ocupacion: 78, estado: 'medio',         producto: 'Alimento Premium',       lote: 'LOT-2026-04-067', vencimiento: '2026-06-01', galponId: 'g1' },
  { id: 'c07', codigo: 'G1-C07', ocupacion: 0,  estado: 'cuarentena',    producto: 'Alimento 3mm',           lote: 'LOT-2026-03-102', vencimiento: '2026-05-15', galponId: 'g1' },
  { id: 'c08', codigo: 'G1-C08', ocupacion: 15, estado: 'disponible',    producto: null,                     lote: null,              vencimiento: null,          galponId: 'g1' },
];

const fillers: Container[] = Array.from({ length: 12 }).map((_, i) => {
  const idx  = i + 9;
  const ocup = [30, 55, 88, 12, 70, 95, 25, 60, 40, 82, 5, 50][i];
  const est  = estadoFromOcup(ocup);
  return {
    id:          `c${String(idx).padStart(2, '0')}`,
    codigo:      `G1-C${String(idx).padStart(2, '0')}`,
    ocupacion:   ocup,
    estado:      est,
    producto:    ocup > 0 ? 'Alimento 5mm' : null,
    lote:        ocup > 0 ? `LOT-2026-04-${100 + i}` : null,
    vencimiento: ocup > 0 ? '2026-08-30' : null,
    galponId:    'g1',
  };
});
export const containers: Container[] = [...baseG1, ...fillers];

export const movimientosPendientes: Movimiento[] = [
  { id: 'm1', producto: 'Alimento 5mm',   tipo: 'entrada_proveedor', operario: 'Carlos Mamani',   galpon: 'G1', hora: '08:32', lote: 'LOT-2026-04-091', estado: 'pendiente' },
  { id: 'm2', producto: 'Vitamina C Plus', tipo: 'entrada_proveedor', operario: 'Jean Pierre',    galpon: 'G3', hora: '09:15', lote: 'LOT-2026-04-092', estado: 'pendiente' },
  { id: 'm3', producto: 'Alimento 8mm',   tipo: 'salida_produccion', operario: 'María González',  galpon: 'G1', hora: '10:05', lote: 'LOT-2026-03-089', estado: 'pendiente' },
];

