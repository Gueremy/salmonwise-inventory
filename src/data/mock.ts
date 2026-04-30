export type EstadoContainer = "disponible" | "medio" | "critico" | "mantenimiento" | "cuarentena";
export type TipoSede = "embarcacion" | "planta" | "bodega";
export type Rol = "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";

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
  tipo: "entrada_proveedor" | "salida_produccion" | "traslado_interno";
  operario: string;
  galpon: string;
  hora: string;
  lote: string;
  estado: "pendiente" | "aprobado" | "rechazado";
}

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  sede: string;
}

export const sedes: Sede[] = [
  { id: "s1", nombre: "Pontón Los Ángeles", tipo: "embarcacion", ocupacion: 72, alertas: 1, movimientosHoy: 4 },
  { id: "s2", nombre: "Planta Puerto Montt", tipo: "planta", ocupacion: 45, alertas: 0, movimientosHoy: 12 },
  { id: "s3", nombre: "Bodega Central", tipo: "bodega", ocupacion: 88, alertas: 3, movimientosHoy: 6 },
  { id: "s4", nombre: "Pontón Bahía Sur", tipo: "embarcacion", ocupacion: 31, alertas: 0, movimientosHoy: 2 },
];

export const galpones: Galpon[] = [
  { id: "g1", codigo: "G1", nombre: "Alimentos", containers: 20, ocupacion_prom: 58, sedeId: "s2" },
  { id: "g2", codigo: "G2", nombre: "Químicos", containers: 12, ocupacion_prom: 81, sedeId: "s2" },
  { id: "g3", codigo: "G3", nombre: "Veterinarios", containers: 8, ocupacion_prom: 34, sedeId: "s2" },
  { id: "g4", codigo: "G1", nombre: "Alimentos", containers: 12, ocupacion_prom: 72, sedeId: "s1" },
  { id: "g5", codigo: "G2", nombre: "Veterinarios", containers: 6, ocupacion_prom: 65, sedeId: "s1" },
  { id: "g6", codigo: "G1", nombre: "Insumos Generales", containers: 24, ocupacion_prom: 88, sedeId: "s3" },
  { id: "g7", codigo: "G2", nombre: "Químicos", containers: 16, ocupacion_prom: 90, sedeId: "s3" },
  { id: "g8", codigo: "G1", nombre: "Alimentos", containers: 12, ocupacion_prom: 31, sedeId: "s4" },
];

const estadoFromOcup = (ocup: number): EstadoContainer => {
  if (ocup === 0) return "disponible";
  if (ocup < 41) return "disponible";
  if (ocup < 80) return "medio";
  return "critico";
};

// Genera 20 containers para galpón G1 de Planta Puerto Montt (datos del prompt + relleno)
const baseG1: Container[] = [
  { id: "c01", codigo: "G1-C01", ocupacion: 20, estado: "disponible", producto: "Alimento Skretting 5mm", lote: "LOT-2026-04-001", vencimiento: "2026-08-15", galponId: "g1" },
  { id: "c02", codigo: "G1-C02", ocupacion: 65, estado: "medio", producto: "Alimento 3mm", lote: "LOT-2026-04-023", vencimiento: "2026-07-20", galponId: "g1" },
  { id: "c03", codigo: "G1-C03", ocupacion: 92, estado: "critico", producto: "Alimento 8mm", lote: "LOT-2026-03-089", vencimiento: "2026-05-30", galponId: "g1" },
  { id: "c04", codigo: "G1-C04", ocupacion: 0, estado: "mantenimiento", producto: null, lote: null, vencimiento: null, galponId: "g1" },
  { id: "c05", codigo: "G1-C05", ocupacion: 45, estado: "medio", producto: "Alimento 5mm", lote: "LOT-2026-04-045", vencimiento: "2026-09-10", galponId: "g1" },
  { id: "c06", codigo: "G1-C06", ocupacion: 78, estado: "medio", producto: "Alimento Premium", lote: "LOT-2026-04-067", vencimiento: "2026-06-01", galponId: "g1" },
  { id: "c07", codigo: "G1-C07", ocupacion: 0, estado: "cuarentena", producto: "Alimento 3mm", lote: "LOT-2026-03-102", vencimiento: "2026-05-15", galponId: "g1" },
  { id: "c08", codigo: "G1-C08", ocupacion: 15, estado: "disponible", producto: null, lote: null, vencimiento: null, galponId: "g1" },
];
const fillers: Container[] = Array.from({ length: 12 }).map((_, i) => {
  const idx = i + 9;
  const ocup = [30, 55, 88, 12, 70, 95, 25, 60, 40, 82, 5, 50][i];
  const est = estadoFromOcup(ocup);
  return {
    id: `c${String(idx).padStart(2, "0")}`,
    codigo: `G1-C${String(idx).padStart(2, "0")}`,
    ocupacion: ocup,
    estado: est,
    producto: ocup > 0 ? "Alimento 5mm" : null,
    lote: ocup > 0 ? `LOT-2026-04-${100 + i}` : null,
    vencimiento: ocup > 0 ? "2026-08-30" : null,
    galponId: "g1",
  };
});
export const containers: Container[] = [...baseG1, ...fillers];

export const movimientosPendientes: Movimiento[] = [
  { id: "m1", producto: "Alimento 5mm", tipo: "entrada_proveedor", operario: "Carlos Mamani", galpon: "G1", hora: "08:32", lote: "LOT-2026-04-091", estado: "pendiente" },
  { id: "m2", producto: "Vitamina C Plus", tipo: "entrada_proveedor", operario: "Jean Pierre", galpon: "G3", hora: "09:15", lote: "LOT-2026-04-092", estado: "pendiente" },
  { id: "m3", producto: "Alimento 8mm", tipo: "salida_produccion", operario: "María González", galpon: "G1", hora: "10:05", lote: "LOT-2026-03-089", estado: "pendiente" },
];

export const usuarios: Usuario[] = [
  { id: "u1", nombre: "Roberto Soto", rol: "jefe_bodega", sede: "Planta Puerto Montt" },
  { id: "u2", nombre: "Carmen Díaz", rol: "admin_sede", sede: "Planta Puerto Montt" },
  { id: "u3", nombre: "Carlos Mamani", rol: "operario", sede: "Planta Puerto Montt" },
  { id: "u4", nombre: "Alejandro Torres", rol: "gerencia", sede: "Global" },
  { id: "u5", nombre: "Admin Sistema", rol: "super_admin", sede: "Global" },
];

export const rolLabel: Record<Rol, string> = {
  jefe_bodega: "Jefe de Bodega",
  admin_sede: "Admin Sede",
  operario: "Operario",
  gerencia: "Gerencia",
  super_admin: "Super Admin",
};

export const estadoColor: Record<EstadoContainer, string> = {
  disponible: "#22C55E",
  medio: "#EAB308",
  critico: "#EF4444",
  mantenimiento: "#9CA3AF",
  cuarentena: "#8B5CF6",
};

export const estadoLabel: Record<EstadoContainer, string> = {
  disponible: "Disponible",
  medio: "Medio",
  critico: "Crítico",
  mantenimiento: "Mantenimiento",
  cuarentena: "Cuarentena",
};

export const ocupacionToEstado = (o: number): EstadoContainer => {
  if (o < 41) return "disponible";
  if (o < 80) return "medio";
  return "critico";
};
