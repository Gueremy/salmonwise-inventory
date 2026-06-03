import type { ApiAlerta, ApiContainer, ApiGalpon, ApiSede } from "@/lib/api";

export type EstadoContainer = "disponible" | "medio" | "critico" | "mantenimiento" | "cuarentena";
export type TipoSede = "embarcacion" | "planta" | "bodega";

export interface InventorySede {
  id: string;
  nombre: string;
  tipo: TipoSede;
  ocupacion: number;
  alertas: number;
}

export interface InventoryGalpon {
  id: string;
  codigo: string;
  nombre: string;
  containers: number;
  ocupacion_prom: number;
  sedeId: string;
}

export interface InventoryContainerView {
  id: string;
  codigo: string;
  ocupacion: number;
  estado: EstadoContainer;
  producto: string | null;
  lote: string | null;
  vencimiento: string | null;
  galponId: string;
  capacidadMax: number;
  ocupacionActual: number;
  unidadMedida: string;
  tipoProductoPermitido: string;
  posicionFila: number;
  posicionCol: number;
}

export interface InventorySnapshot {
  sedes: InventorySede[];
  galpones: InventoryGalpon[];
  containers: InventoryContainerView[];
}

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
  critico: "Critico",
  mantenimiento: "Mantenimiento",
  cuarentena: "Cuarentena",
};

export const ocupacionToEstado = (ocupacion: number): EstadoContainer => {
  if (ocupacion < 41) return "disponible";
  if (ocupacion < 80) return "medio";
  return "critico";
};

const tipoSedeMap: Record<ApiSede["tipo"], TipoSede> = {
  ponton: "embarcacion",
  planta: "planta",
  bodega: "bodega",
};

const tipoProductoLabelMap: Record<string, string> = {
  alimento: "Alimento",
  quimico: "Quimico",
  veterinario: "Veterinario",
  equipo: "Equipo",
  repuesto: "Repuesto",
  general: "Carga general",
};

function toOccupancyPercent(ocupacionActual: number, capacidadMax: number) {
  if (!capacidadMax) return 0;
  return Math.round((ocupacionActual / capacidadMax) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function buildContainer(container: ApiContainer): InventoryContainerView {
  const ocupacion = toOccupancyPercent(container.ocupacion_actual, container.capacidad_max);
  const productoBase = tipoProductoLabelMap[container.tipo_producto_permitido] ?? container.tipo_producto_permitido;
  const hasContent = container.ocupacion_actual > 0;

  return {
    id: container.id,
    codigo: container.codigo,
    ocupacion,
    estado: container.estado as EstadoContainer,
    producto: hasContent ? productoBase : null,
    lote: null,
    vencimiento: null,
    galponId: container.id_galpon,
    capacidadMax: container.capacidad_max,
    ocupacionActual: container.ocupacion_actual,
    unidadMedida: container.unidad_medida,
    tipoProductoPermitido: container.tipo_producto_permitido,
    posicionFila: container.posicion_fila,
    posicionCol: container.posicion_col,
  };
}

export function buildInventorySnapshot(input: {
  sedes: ApiSede[];
  galpones: ApiGalpon[];
  containers: ApiContainer[];
  alertas: ApiAlerta[];
}): InventorySnapshot {
  const containers = input.containers
    .map(buildContainer)
    .sort((left, right) => {
      if (left.galponId !== right.galponId) {
        return left.galponId.localeCompare(right.galponId);
      }

      if (left.posicionFila !== right.posicionFila) {
        return left.posicionFila - right.posicionFila;
      }

      return left.posicionCol - right.posicionCol;
    });

  const containersByGalpon = new Map<string, InventoryContainerView[]>();
  const containerToGalpon = new Map<string, string>();

  for (const container of containers) {
    containerToGalpon.set(container.id, container.galponId);
    const items = containersByGalpon.get(container.galponId) ?? [];
    items.push(container);
    containersByGalpon.set(container.galponId, items);
  }

  const alertCountBySede = new Map<string, number>();
  const galponToSede = new Map<string, string>();

  for (const galpon of input.galpones) {
    galponToSede.set(galpon.id, galpon.id_sede);
  }

  for (const alerta of input.alertas) {
    const galponId = containerToGalpon.get(alerta.id_container);
    const sedeId = galponId ? galponToSede.get(galponId) : null;

    if (!sedeId) continue;
    alertCountBySede.set(sedeId, (alertCountBySede.get(sedeId) ?? 0) + 1);
  }

  const galpones = input.galpones
    .map((galpon) => {
      const galponContainers = containersByGalpon.get(galpon.id) ?? [];

      return {
        id: galpon.id,
        codigo: galpon.codigo,
        nombre: galpon.nombre,
        containers: galponContainers.length,
        ocupacion_prom: average(galponContainers.map((item) => item.ocupacion)),
        sedeId: galpon.id_sede,
      };
    })
    .sort((left, right) => left.codigo.localeCompare(right.codigo));

  const galponesBySede = new Map<string, InventoryGalpon[]>();

  for (const galpon of galpones) {
    const items = galponesBySede.get(galpon.sedeId) ?? [];
    items.push(galpon);
    galponesBySede.set(galpon.sedeId, items);
  }

  const sedes = input.sedes
    .filter((sede) => sede.estado === "activo")
    .map((sede) => {
      const sedeGalpones = galponesBySede.get(sede.id) ?? [];
      const occupancyValues = sedeGalpones.map((galpon) => galpon.ocupacion_prom);

      return {
        id: sede.id,
        nombre: sede.nombre,
        tipo: tipoSedeMap[sede.tipo],
        ocupacion: average(occupancyValues),
        alertas: alertCountBySede.get(sede.id) ?? 0,
      };
    });

  return {
    sedes,
    galpones,
    containers,
  };
}
