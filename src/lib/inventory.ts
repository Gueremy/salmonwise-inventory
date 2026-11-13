import type { ApiAlerta, ApiContainer, ApiGalpon, ApiSede } from "@/lib/api";
import { resolveLocationVisualState } from "@/domain/location";
import type { OrganizationConfig } from "@/domain/organization";

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
  /** Categoría del ítem principal almacenado, si hay contenido. */
  categoria: string | null;
  /** Coordenadas del editor de layout, cuando existen. */
  layoutX: number | null;
  layoutZ: number | null;
}

export interface InventorySnapshot {
  sedes: InventorySede[];
  galpones: InventoryGalpon[];
  containers: InventoryContainerView[];
}

export const estadoColor: Record<EstadoContainer, string> = {
  disponible: "hsl(var(--status-disponible))",
  medio: "hsl(var(--status-medio))",
  critico: "hsl(var(--status-critico))",
  mantenimiento: "hsl(var(--status-mantenimiento))",
  cuarentena: "hsl(var(--status-cuarentena))",
};

export const estadoLabel: Record<EstadoContainer, string> = {
  disponible: "Disponible",
  medio: "Medio",
  critico: "Critico",
  mantenimiento: "Mantenimiento",
  cuarentena: "Cuarentena",
};

export const ocupacionToEstado = (ocupacion: number, config?: OrganizationConfig): EstadoContainer => {
  const thresholds = config?.umbrales;
  if (ocupacion <= (thresholds?.disponible_max ?? 40)) return "disponible";
  if (ocupacion <= (thresholds?.medio_max ?? 79)) return "medio";
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

function weightedOccupancy(locations: InventoryContainerView[]) {
  if (!locations.length) return 0;
  const units = new Set(locations.map((location) => location.unidadMedida));
  if (units.size > 1) return Math.round(locations.reduce((sum, location) => sum + location.ocupacion, 0) / locations.length * 100) / 100;
  const capacity = locations.reduce((sum, location) => sum + Number(location.capacidadMax), 0);
  const stock = locations.reduce((sum, location) => sum + Number(location.ocupacionActual), 0);
  return capacity ? Math.round(stock / capacity * 10000) / 100 : 0;
}

function buildContainer(container: ApiContainer, config?: OrganizationConfig): InventoryContainerView {
  const ocupacion = toOccupancyPercent(container.ocupacion_actual, container.capacidad_max);
  const productoBase = tipoProductoLabelMap[container.tipo_producto_permitido] ?? container.tipo_producto_permitido;
  const hasContent = container.ocupacion_actual > 0;

  return {
    id: container.id,
    codigo: container.codigo,
    ocupacion,
    estado: resolveLocationVisualState({
      ocupacion_actual: container.ocupacion_actual,
      capacidad_maxima: container.capacidad_max,
      estado: container.estado,
    }, config).estado as EstadoContainer,
    producto: hasContent ? container.producto_nombre ?? "Contenido histórico incompleto" : null,
    lote: container.numero_lote ?? null,
    vencimiento: container.fecha_vencimiento ?? null,
    galponId: container.id_galpon,
    capacidadMax: container.capacidad_max,
    ocupacionActual: container.ocupacion_actual,
    unidadMedida: container.unidad_medida,
    tipoProductoPermitido: container.tipo_producto_permitido,
    posicionFila: container.posicion_fila,
    posicionCol: container.posicion_col,
    categoria: hasContent ? container.producto_categoria ?? null : null,
    layoutX: container.layout_x ?? null,
    layoutZ: container.layout_z ?? null,
  };
}

export function buildInventorySnapshot(input: {
  sedes: ApiSede[];
  galpones: ApiGalpon[];
  containers: ApiContainer[];
  alertas: ApiAlerta[];
  config?: OrganizationConfig;
}): InventorySnapshot {
  const containers = input.containers
    .map((container) => buildContainer(container, input.config))
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
        ocupacion_prom: weightedOccupancy(galponContainers),
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
      // Se reutiliza el índice por zona en vez de recorrer todas las ubicaciones por cada sede.
      const siteLocations = sedeGalpones.flatMap((galpon) => containersByGalpon.get(galpon.id) ?? []);

      return {
        id: sede.id,
        nombre: sede.nombre,
        tipo: tipoSedeMap[sede.tipo],
        ocupacion: weightedOccupancy(siteLocations),
        alertas: alertCountBySede.get(sede.id) ?? 0,
      };
    });

  return {
    sedes,
    galpones,
    containers,
  };
}
