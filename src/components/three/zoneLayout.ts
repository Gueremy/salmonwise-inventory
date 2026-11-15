/**
 * Modelo de una zona para la vista 3D: grilla, tipo de carga, pilas y nivel de detalle.
 * Solo funciones puras (sin three.js) para poder probarlas y reutilizarlas.
 */

export type CargoKind = "caja" | "saco" | "tambor" | "granel";

export const CARGO_KINDS: readonly CargoKind[] = ["caja", "saco", "tambor", "granel"];

export const CARGO_LABEL: Record<CargoKind, string> = {
  caja: "Cajas",
  saco: "Sacos",
  tambor: "Tambores",
  granel: "Granel (maxisaco)",
};

/** Triángulos de cada modelo. `cargoModels.ts` debe respetarlos (hay una prueba que lo comprueba). */
export const MODEL_TRIANGLES = {
  caja: 14,
  saco: 28,
  tambor: 32,
  granel: 24,
  pallet: 72,
  palletSimple: 12,
  pad: 2,
} as const;

/** Distancia entre centros de ubicaciones contiguas, en unidades de escena. */
export const CELL_SIZE = 1.6;
/** Lado de la baldosa de piso que se pinta con el color de estado. */
export const PAD_SIZE = 1.44;
export const PALLET = { width: 1.2, height: 0.14, depth: 1.0 } as const;
/** El pallet va corrido hacia atrás para dejar al frente la franja del código. */
export const PALLET_OFFSET_Z = -0.16;
export const LABEL_STRIP = { depth: 0.3, centerZ: 0.54 } as const;

interface StackSpec {
  /** Tamaño de una unidad (ancho, alto, fondo). */
  unit: readonly [number, number, number];
  perRow: number;
  perColumn: number;
  layers: number;
}

export const STACK_SPECS: Record<CargoKind, StackSpec> = {
  caja: { unit: [0.56, 0.34, 0.46], perRow: 2, perColumn: 2, layers: 4 },
  saco: { unit: [0.56, 0.2, 0.94], perRow: 2, perColumn: 1, layers: 6 },
  tambor: { unit: [0.5, 0.7, 0.5], perRow: 2, perColumn: 2, layers: 2 },
  granel: { unit: [1.0, 0.68, 0.9], perRow: 1, perColumn: 1, layers: 2 },
};

export const maxUnitsOf = (kind: CargoKind) => {
  const spec = STACK_SPECS[kind];
  return spec.perRow * spec.perColumn * spec.layers;
};

export const maxStackHeightOf = (kind: CargoKind) => STACK_SPECS[kind].unit[1] * STACK_SPECS[kind].layers;

/** Altura máxima de cualquier pila (pallet incluido); se usa para encuadrar la cámara. */
export const MAX_STACK_HEIGHT = PALLET.height + Math.max(...CARGO_KINDS.map(maxStackHeightOf));

export interface ZoneLocationInput {
  id: string;
  codigo: string;
  /** Ocupación entre 0 y 1 (se recorta si viene fuera de rango). */
  ratio: number;
  fila?: number | null;
  col?: number | null;
  /** Coordenadas guardadas por el editor de layout. */
  x?: number | null;
  z?: number | null;
  categoria?: string | null;
  tipoProducto?: string | null;
  nombre?: string | null;
  unidad?: string | null;
}

// ---------------------------------------------------------------------------
// Tipo de carga
// ---------------------------------------------------------------------------

/** Minúsculas y sin acentos, para comparar texto escrito por personas. */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Palabras clave por tipo. El orden importa: "alimento a granel" es granel, no saco.
 * Ajustar aquí cuando se conozcan las categorías reales del piloto.
 */
export const KIND_PATTERNS: ReadonlyArray<readonly [CargoKind, RegExp]> = [
  ["granel", /granel|maxisaco|big ?bag|bulk|\barena\b|\bcal\b/],
  ["tambor", /quimic|liquid|aceite|combustible|lubric|tambor|bidon|desinfect|acido|cloro|detergente|peroxido/],
  ["saco", /alimento|pellet|\bsacos?\b|harina|\bsal\b|pienso|feed|fertiliz/],
  ["caja", /insumo|veterinar|farmac|vacuna|medicament|repuesto|equipo|\bcajas?\b|envase|\bepp\b|herramienta|general/],
];

const UNIT_KINDS: ReadonlyArray<readonly [CargoKind, RegExp]> = [
  ["tambor", /^(l|lt|lts|litro|litros|m3|ml)$/],
  ["granel", /^(t|ton|tons|tonelada|toneladas)$/],
  ["saco", /^(kg|kgs|kilo|kilos|kilogramo|kilogramos|g|gr)$/],
  ["caja", /^(u|un|und|unidad|unidades|caja|cajas|pieza|piezas)$/],
];

function matchKind(text: string, patterns: ReadonlyArray<readonly [CargoKind, RegExp]>): CargoKind | null {
  if (!text) return null;
  for (const [kind, pattern] of patterns) {
    if (pattern.test(text)) return kind;
  }
  return null;
}

/**
 * Elige el modelo por la categoría del ítem, luego por el tipo de producto permitido
 * en la ubicación, luego por el nombre y al final por la unidad. Sin pistas: cajas.
 * "general" solo decide si nada más específico lo hace.
 */
export function resolveCargoKind(input: Pick<ZoneLocationInput, "categoria" | "tipoProducto" | "nombre" | "unidad">): CargoKind {
  const sources = [input.categoria, input.tipoProducto, input.nombre].map(normalizeText);
  for (const text of sources) {
    if (text === "general" || text === "carga general") continue;
    const kind = matchKind(text, KIND_PATTERNS);
    if (kind) return kind;
  }
  return matchKind(normalizeText(input.unidad), UNIT_KINDS) ?? "caja";
}

// ---------------------------------------------------------------------------
// Grilla
// ---------------------------------------------------------------------------

export type GridSource = "registrada" | "editor" | "compacta";

export interface GridCell {
  col: number;
  row: number;
}

export interface ZoneGrid {
  cols: number;
  rows: number;
  cells: GridCell[];
  source: GridSource;
}

const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isCoordinate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Una grilla sirve si no repite celdas y no deja la zona casi vacía de tan dispersa. */
function usable(cells: GridCell[], cols: number, rows: number): boolean {
  const seen = new Set<number>();
  for (const cell of cells) {
    const key = cell.row * cols + cell.col;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return cols * rows <= Math.max(16, cells.length * 6);
}

function rank(values: number[]): Map<number, number> {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  return new Map(sorted.map((value, index) => [value, index]));
}

function gridFromPairs(pairs: Array<readonly [number, number]>, source: GridSource): ZoneGrid | null {
  // Se compactan los huecos: lo que importa es el orden relativo, no la distancia exacta.
  const colRank = rank(pairs.map(([col]) => col));
  const rowRank = rank(pairs.map(([, row]) => row));
  const cells = pairs.map(([col, row]) => ({ col: colRank.get(col)!, row: rowRank.get(row)! }));
  return usable(cells, colRank.size, rowRank.size) ? { cols: colRank.size, rows: rowRank.size, cells, source } : null;
}

/**
 * Ubica cada posición en una celda. Usa la fila y columna registradas; si faltan o
 * se repiten, las coordenadas del editor; y si tampoco sirven, una grilla compacta.
 * Ninguna ubicación queda encima de otra.
 */
export function layoutGrid(locations: ReadonlyArray<Pick<ZoneLocationInput, "fila" | "col" | "x" | "z">>): ZoneGrid {
  const count = locations.length;
  if (count === 0) return { cols: 0, rows: 0, cells: [], source: "compacta" };

  if (locations.every((location) => isIndex(location.fila) && isIndex(location.col))) {
    const grid = gridFromPairs(locations.map((location) => [location.col!, location.fila!] as const), "registrada");
    if (grid && (count === 1 || grid.cols * grid.rows > 1)) return grid;
  }

  if (locations.every((location) => isCoordinate(location.x) && isCoordinate(location.z))) {
    const round = (value: number) => Math.round(value * 100) / 100;
    const grid = gridFromPairs(locations.map((location) => [round(location.x!), round(location.z!)] as const), "editor");
    if (grid) return grid;
  }

  // Más ancha que profunda: aprovecha mejor una pantalla apaisada.
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.6)));
  const rows = Math.ceil(count / cols);
  return {
    cols,
    rows,
    cells: locations.map((_, index) => ({ col: index % cols, row: Math.floor(index / cols) })),
    source: "compacta",
  };
}

// ---------------------------------------------------------------------------
// Pilas y nivel de detalle
// ---------------------------------------------------------------------------

/** unidades: cada caja/saco/tambor. capas: un bloque por capa. bloque: un bloque por pila. */
export type DetailLevel = "unidades" | "capas" | "bloque";

export interface DetailChoice {
  level: DetailLevel;
  simplePallet: boolean;
}

export const DETAIL_STEPS: readonly DetailChoice[] = [
  { level: "unidades", simplePallet: false },
  { level: "unidades", simplePallet: true },
  { level: "capas", simplePallet: true },
  { level: "bloque", simplePallet: true },
];

export const clampRatio = (ratio: number) => (Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0);

/** Unidades visibles para una ocupación: la altura de la pila representa el llenado. */
export function unitsFor(kind: CargoKind, ratio: number): number {
  const clamped = clampRatio(ratio);
  if (clamped <= 0) return 0;
  return Math.max(1, Math.round(clamped * maxUnitsOf(kind)));
}

/** Instancias que dibuja una pila en cada nivel de detalle. */
export function instancesFor(kind: CargoKind, ratio: number, level: DetailLevel): number {
  const units = unitsFor(kind, ratio);
  if (units === 0) return 0;
  if (level === "bloque") return 1;
  if (level === "unidades") return units;
  const spec = STACK_SPECS[kind];
  return Math.ceil(units / (spec.perRow * spec.perColumn));
}

export interface StackSummary {
  kind: CargoKind;
  ratio: number;
}

export function estimateTriangles(stacks: readonly StackSummary[], totalLocations: number, choice: DetailChoice): number {
  let triangles = totalLocations * MODEL_TRIANGLES.pad;
  const pallet = choice.simplePallet ? MODEL_TRIANGLES.palletSimple : MODEL_TRIANGLES.pallet;
  for (const stack of stacks) {
    const instances = instancesFor(stack.kind, stack.ratio, choice.level);
    if (instances > 0) triangles += pallet + instances * MODEL_TRIANGLES[stack.kind];
  }
  return triangles;
}

/** El mayor detalle que cabe en el presupuesto; si nada cabe, el mínimo. */
export function chooseDetail(stacks: readonly StackSummary[], totalLocations: number, triangleBudget: number): DetailChoice {
  for (const step of DETAIL_STEPS) {
    if (estimateTriangles(stacks, totalLocations, step) <= triangleBudget) return step;
  }
  return DETAIL_STEPS[DETAIL_STEPS.length - 1];
}

/** Valores por instancia: x, y, z (base), ancho, alto, fondo. */
export const INSTANCE_STRIDE = 6;

function pushInstance(target: number[], x: number, y: number, z: number, width: number, height: number, depth: number) {
  target.push(x, y, z, width, height, depth);
}

/** Agrega las instancias de una pila centrada en (cx, cz) sobre su pallet. */
export function pushStack(target: number[], kind: CargoKind, ratio: number, level: DetailLevel, cx: number, cz: number) {
  const units = unitsFor(kind, ratio);
  if (units === 0) return;
  const spec = STACK_SPECS[kind];
  const [width, height, depth] = spec.unit;
  const perLayer = spec.perRow * spec.perColumn;
  const footprintWidth = width * spec.perRow;
  const footprintDepth = depth * spec.perColumn;
  const baseY = PALLET.height;
  const centerZ = cz + PALLET_OFFSET_Z;

  if (level === "bloque") {
    // Altura continua: en el detalle mínimo se conserva la lectura de ocupación.
    pushInstance(target, cx, baseY, centerZ, footprintWidth, Math.max(height * 0.5, clampRatio(ratio) * maxStackHeightOf(kind)), footprintDepth);
    return;
  }

  const layers = Math.ceil(units / perLayer);
  if (level === "capas") {
    for (let layer = 0; layer < layers; layer += 1) {
      const inLayer = Math.min(perLayer, units - layer * perLayer);
      // La capa superior incompleta se angosta para insinuar que no está llena.
      const share = inLayer / perLayer;
      pushInstance(target, cx - (footprintWidth * (1 - share)) / 2, baseY + layer * height, centerZ, footprintWidth * share, height, footprintDepth);
    }
    return;
  }

  for (let unit = 0; unit < units; unit += 1) {
    const layer = Math.floor(unit / perLayer);
    const slot = unit % perLayer;
    const column = slot % spec.perRow;
    const row = Math.floor(slot / spec.perRow);
    pushInstance(
      target,
      cx + (column - (spec.perRow - 1) / 2) * width,
      baseY + layer * height,
      centerZ + (row - (spec.perColumn - 1) / 2) * depth,
      width * 0.96,
      height * 0.98,
      depth * 0.96,
    );
  }
}

// ---------------------------------------------------------------------------
// Modelo completo
// ---------------------------------------------------------------------------

export interface ZoneCell {
  id: string;
  codigo: string;
  index: number;
  x: number;
  z: number;
  ratio: number;
  /** null cuando la ubicación está vacía. */
  kind: CargoKind | null;
  /** Altura de pallet más carga; 0 si está vacía. */
  height: number;
}

export interface ZoneModel {
  grid: ZoneGrid;
  cells: ZoneCell[];
  /** Tamaño del piso ocupado por la grilla. */
  width: number;
  depth: number;
  detail: DetailChoice;
  /** Instancias empaquetadas (INSTANCE_STRIDE valores cada una) por tipo de carga. */
  cargo: Record<CargoKind, Float32Array>;
  /** Pallets: x, z por instancia. */
  pallets: Float32Array;
  /** Tipos de carga presentes, en orden estable, para la leyenda. */
  kinds: CargoKind[];
  triangles: number;
}

export interface ZoneModelOptions {
  triangleBudget: number;
}

export function buildZoneModel(locations: readonly ZoneLocationInput[], options: ZoneModelOptions): ZoneModel {
  const grid = layoutGrid(locations);
  const width = Math.max(1, grid.cols) * CELL_SIZE;
  const depth = Math.max(1, grid.rows) * CELL_SIZE;

  const cells: ZoneCell[] = locations.map((location, index) => {
    const cell = grid.cells[index];
    const ratio = clampRatio(location.ratio);
    const kind = ratio > 0 ? resolveCargoKind(location) : null;
    return {
      id: location.id,
      codigo: location.codigo,
      index,
      x: (cell.col - (grid.cols - 1) / 2) * CELL_SIZE,
      z: (cell.row - (grid.rows - 1) / 2) * CELL_SIZE,
      ratio,
      kind,
      height: 0,
    };
  });

  const stacks: StackSummary[] = [];
  for (const cell of cells) {
    if (cell.kind) stacks.push({ kind: cell.kind, ratio: cell.ratio });
  }
  const detail = chooseDetail(stacks, cells.length, options.triangleBudget);

  const packed: Record<CargoKind, number[]> = { caja: [], saco: [], tambor: [], granel: [] };
  const pallets: number[] = [];
  for (const cell of cells) {
    if (!cell.kind) continue;
    const target = packed[cell.kind];
    const start = target.length;
    pushStack(target, cell.kind, cell.ratio, detail.level, cell.x, cell.z);
    pallets.push(cell.x, cell.z + PALLET_OFFSET_Z);
    let top: number = PALLET.height;
    for (let offset = start; offset < target.length; offset += INSTANCE_STRIDE) {
      top = Math.max(top, target[offset + 1] + target[offset + 4]);
    }
    cell.height = top;
  }

  return {
    grid,
    cells,
    width,
    depth,
    detail,
    cargo: {
      caja: Float32Array.from(packed.caja),
      saco: Float32Array.from(packed.saco),
      tambor: Float32Array.from(packed.tambor),
      granel: Float32Array.from(packed.granel),
    },
    pallets: Float32Array.from(pallets),
    kinds: CARGO_KINDS.filter((kind) => packed[kind].length > 0),
    triangles: estimateTriangles(stacks, cells.length, detail),
  };
}
