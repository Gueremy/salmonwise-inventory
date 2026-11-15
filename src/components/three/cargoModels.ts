/**
 * Geometrías y materiales de las cargas, generados por código y compartidos.
 * Cada modelo cabe en una caja unitaria (x y z entre -0.5 y 0.5, base en y = 0) y se
 * escala por instancia. Los detalles van como color por vértice: no hay texturas.
 */
import { BufferAttribute, BufferGeometry, BoxGeometry, EdgesGeometry, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, ConeGeometry } from "three";
import { PALLET, type CargoKind } from "./zoneLayout";

type Vec3 = readonly [number, number, number];
type Rgb = readonly [number, number, number];

const rgb = (hex: number): Rgb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];

  get triangles() {
    return this.positions.length / 9;
  }

  /** Agrega un triángulo orientado hacia afuera respecto de `center`. */
  tri(a: Vec3, b: Vec3, c: Vec3, color: Rgb, center: Vec3) {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const mx = (a[0] + b[0] + c[0]) / 3 - center[0];
    const my = (a[1] + b[1] + c[1]) / 3 - center[1];
    const mz = (a[2] + b[2] + c[2]) / 3 - center[2];
    let second = b;
    let third = c;
    if (nx * mx + ny * my + nz * mz < 0) {
      second = c;
      third = b;
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const length = Math.hypot(nx, ny, nz) || 1;
    for (const vertex of [a, second, third]) {
      this.positions.push(vertex[0], vertex[1], vertex[2]);
      this.normals.push(nx / length, ny / length, nz / length);
      this.colors.push(color[0], color[1], color[2]);
    }
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: Rgb, center: Vec3) {
    this.tri(a, b, c, color, center);
    this.tri(a, c, d, color, center);
  }

  /** Caja alineada a los ejes: 12 triángulos. */
  box(min: Vec3, max: Vec3, color: Rgb, topColor: Rgb = color) {
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, center);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], color, center);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color, center);
    this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], color, center);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], topColor, center);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color, center);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(this.colors), 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const CENTER: Vec3 = [0, 0.5, 0];

/** Caja de cartón con cinta de embalaje: 14 triángulos. */
function buildBox(): BufferGeometry {
  const builder = new MeshBuilder();
  const cardboard = rgb(0xb9844f);
  builder.box([-0.5, 0, -0.5], [0.5, 1, 0.5], cardboard, rgb(0xc9965f));
  const tape = rgb(0xefe2c0);
  builder.quad([-0.09, 1.012, -0.5], [0.09, 1.012, -0.5], [0.09, 1.012, 0.5], [-0.09, 1.012, 0.5], tape, CENTER);
  return builder.build();
}

/** Saco acostado, más ancho al centro, con costuras oscuras en los extremos: 28 triángulos. */
function buildSack(): BufferGeometry {
  const builder = new MeshBuilder();
  const cloth = rgb(0xe2d2a8);
  const seam = rgb(0xb59c6c);
  const ring = (y: number, inset: number): Vec3[] => {
    const half = 0.5 * inset;
    return [[-half, y, -0.5 * (inset * 0.5 + 0.5)], [half, y, -0.5 * (inset * 0.5 + 0.5)], [half, y, 0.5 * (inset * 0.5 + 0.5)], [-half, y, 0.5 * (inset * 0.5 + 0.5)]];
  };
  const rings = [ring(0, 0.82), ring(0.28, 1), ring(0.72, 1), ring(1, 0.82)];
  builder.quad(rings[0][0], rings[0][1], rings[0][2], rings[0][3], seam, CENTER);
  for (let level = 0; level < rings.length - 1; level += 1) {
    const lower = rings[level];
    const upper = rings[level + 1];
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      // Los costados cortos (extremos del saco) llevan el color de la costura.
      builder.quad(lower[side], lower[next], upper[next], upper[side], side % 2 === 0 ? seam : cloth, CENTER);
    }
  }
  builder.quad(rings[3][0], rings[3][1], rings[3][2], rings[3][3], cloth, CENTER);
  return builder.build();
}

/** Tambor octagonal con tapa clara: 32 triángulos. */
function buildDrum(): BufferGeometry {
  const builder = new MeshBuilder();
  const body = rgb(0x2f6fb0);
  const band = rgb(0x275c93);
  const lid = rgb(0x9fb4c8);
  const sides = 8;
  const point = (index: number, y: number): Vec3 => {
    const angle = ((index % sides) / sides) * Math.PI * 2 + Math.PI / sides;
    return [Math.cos(angle) * 0.5, y, Math.sin(angle) * 0.5];
  };
  for (let side = 0; side < sides; side += 1) {
    builder.quad(point(side, 0), point(side + 1, 0), point(side + 1, 1), point(side, 1), side % 2 === 0 ? body : band, CENTER);
    builder.tri([0, 1, 0], point(side, 1), point(side + 1, 1), lid, CENTER);
    builder.tri([0, 0, 0], point(side, 0), point(side + 1, 0), band, CENTER);
  }
  return builder.build();
}

/** Maxisaco: cuerpo blanco y cuatro asas de izaje azules: 24 triángulos. */
function buildBulkBag(): BufferGeometry {
  const builder = new MeshBuilder();
  builder.box([-0.5, 0, -0.5], [0.5, 0.86, 0.5], rgb(0xf4f2ec), rgb(0xe2dfd4));
  const strap = rgb(0x2f7fc4);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const base: Vec3[] = [[sx * 0.5, 0.86, sz * 0.5], [sx * 0.26, 0.86, sz * 0.5], [sx * 0.5, 0.86, sz * 0.26]];
    const tip: Vec3 = [sx * 0.4, 1, sz * 0.4];
    const center: Vec3 = [sx * 0.42, 0.9, sz * 0.42];
    builder.tri(base[0], base[1], tip, strap, center);
    builder.tri(base[1], base[2], tip, strap, center);
    builder.tri(base[2], base[0], tip, strap, center);
  }
  return builder.build();
}

/** Pallet de tres tablas sobre tres patines: 72 triángulos. Ya está en tamaño real. */
function buildPallet(): BufferGeometry {
  const builder = new MeshBuilder();
  const wood = rgb(0xa57e52);
  const board = rgb(0xb8915f);
  const halfWidth = PALLET.width / 2;
  const halfDepth = PALLET.depth / 2;
  const runnerTop = PALLET.height * 0.6;
  for (const x of [-halfWidth + 0.07, 0, halfWidth - 0.07]) {
    builder.box([x - 0.07, 0, -halfDepth], [x + 0.07, runnerTop, halfDepth], wood);
  }
  for (const z of [-halfDepth + 0.14, 0, halfDepth - 0.14]) {
    builder.box([-halfWidth, runnerTop, z - 0.14], [halfWidth, PALLET.height, z + 0.14], board);
  }
  return builder.build();
}

/** Pallet reducido a una tabla: 12 triángulos. */
function buildSimplePallet(): BufferGeometry {
  const builder = new MeshBuilder();
  builder.box([-PALLET.width / 2, 0, -PALLET.depth / 2], [PALLET.width / 2, PALLET.height, PALLET.depth / 2], rgb(0xa57e52), rgb(0xb8915f));
  return builder.build();
}

const builders = {
  caja: buildBox,
  saco: buildSack,
  tambor: buildDrum,
  granel: buildBulkBag,
  pallet: buildPallet,
  palletSimple: buildSimplePallet,
} as const;

export type ModelName = keyof typeof builders;

const geometryCache = new Map<string, BufferGeometry>();

function cached<T extends BufferGeometry>(key: string, create: () => T): T {
  let geometry = geometryCache.get(key) as T | undefined;
  if (!geometry) {
    geometry = create();
    geometryCache.set(key, geometry);
  }
  return geometry;
}

/** Geometría compartida: se crea una sola vez y se reutiliza entre escenas. */
export const modelGeometry = (name: ModelName | CargoKind): BufferGeometry => cached(name, builders[name]);

export const triangleCount = (geometry: BufferGeometry) =>
  (geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3;

/** Baldosa horizontal unitaria (piso, baldosas de estado, etiquetas). */
export const floorPlaneGeometry = () => cached("floor-plane", () => {
  const plane = new PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  return plane;
});

/** Caja unitaria con base en y = 0 (selección, bloques de zona, casco). */
export const unitBoxGeometry = () => cached("unit-box", () => {
  const box = new BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  return box;
});

/** Aristas de la caja unitaria, para marcar la ubicación seleccionada. */
export const unitBoxEdgesGeometry = () => cached("unit-box-edges", () => new EdgesGeometry(unitBoxGeometry()));

/** Flecha que apunta hacia abajo, con la punta en el origen. */
export const pointerGeometry = () => cached("pointer", () => {
  const cone = new ConeGeometry(0.26, 0.6, 4);
  cone.rotateX(Math.PI);
  cone.translate(0, 0.3, 0);
  return cone;
});

let cargoMaterial: MeshLambertMaterial | null = null;
let blockMaterial: MeshLambertMaterial | null = null;
let pickMaterial: MeshBasicMaterial | null = null;
let padMaterial: MeshBasicMaterial | null = null;

/** Material de cargas y pallets. Lambert es más barato que Standard y no hay sombras. */
export function sharedCargoMaterial(): MeshLambertMaterial {
  cargoMaterial ??= new MeshLambertMaterial({ vertexColors: true });
  return cargoMaterial;
}

/** Material invisible: no genera llamadas de dibujo, pero sí responde al puntero. */
export function sharedPickMaterial(): MeshBasicMaterial {
  pickMaterial ??= new MeshBasicMaterial({ visible: false });
  return pickMaterial;
}

/** Baldosas de estado: sin iluminación para que el color coincida con la leyenda. */
export function sharedPadMaterial(): MeshBasicMaterial {
  padMaterial ??= new MeshBasicMaterial({ toneMapped: false });
  return padMaterial;
}

/** Bloques lisos cuyo color se define por instancia (relleno de zonas). */
export function sharedBlockMaterial(): MeshLambertMaterial {
  blockMaterial ??= new MeshLambertMaterial();
  return blockMaterial;
}

/**
 * Aristas de muchas cajas en una sola geometría (una llamada de dibujo).
 * `packed` trae x, y, z (base), ancho, alto, fondo por caja.
 */
export function mergedBoxEdges(packed: ArrayLike<number>): BufferGeometry {
  const source = unitBoxEdgesGeometry().getAttribute("position");
  const boxes = Math.floor(packed.length / 6);
  const positions = new Float32Array(boxes * source.count * 3);
  let cursor = 0;
  for (let box = 0; box < boxes; box += 1) {
    const offset = box * 6;
    for (let vertex = 0; vertex < source.count; vertex += 1) {
      positions[cursor++] = packed[offset] + source.getX(vertex) * packed[offset + 3];
      positions[cursor++] = packed[offset + 1] + source.getY(vertex) * packed[offset + 4];
      positions[cursor++] = packed[offset + 2] + source.getZ(vertex) * packed[offset + 5];
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
