/**
 * Modelo de un sitio para la vista 3D: un bloque por zona cuyo relleno representa
 * la ocupación, más el cascarón (bodega o pontón). Solo funciones puras.
 */

export interface SiteZoneInput {
  id: string;
  codigo: string;
  nombre?: string | null;
  /** Ocupación promedio en porcentaje (0 a 100). */
  ocupacion: number;
  ubicaciones: number;
}

export interface SiteBlock {
  id: string;
  index: number;
  x: number;
  z: number;
  /** Ocupación entre 0 y 1. */
  ratio: number;
  fillHeight: number;
}

export type ShellKind = "flotante" | "terrestre";

export interface SiteModel {
  blocks: SiteBlock[];
  cols: number;
  rows: number;
  /** Tamaño de la planta que ocupan los bloques. */
  width: number;
  depth: number;
  /** Tamaño del piso o cubierta que los contiene. */
  floorWidth: number;
  floorDepth: number;
  height: number;
  shell: ShellKind;
}

export const ZONE_BLOCK = { size: 2.4, pitch: 3.2, height: 1.8, minFill: 0.06 } as const;
export const SITE_LABEL_STRIP = { depth: 0.5, offsetZ: 1.5 } as const;
const FLOOR_MARGIN = 1.6;

export const shellKindOf = (tipo: string): ShellKind => (tipo === "embarcacion" || tipo === "ponton" ? "flotante" : "terrestre");

export const clampPercent = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

/** Columnas de la planta: alargada, como una nave o la cubierta de un pontón. */
export function siteColumns(count: number): number {
  if (count <= 0) return 0;
  return Math.min(count, Math.max(1, Math.ceil(Math.sqrt(count * 2))));
}

export function buildSiteModel(zones: readonly SiteZoneInput[], tipo: string): SiteModel {
  const cols = siteColumns(zones.length);
  const rows = cols === 0 ? 0 : Math.ceil(zones.length / cols);
  const width = Math.max(1, cols) * ZONE_BLOCK.pitch;
  const depth = Math.max(1, rows) * ZONE_BLOCK.pitch;

  const blocks = zones.map((zone, index) => {
    const ratio = clampPercent(zone.ocupacion) / 100;
    return {
      id: zone.id,
      index,
      x: ((index % cols) - (cols - 1) / 2) * ZONE_BLOCK.pitch,
      z: (Math.floor(index / cols) - (rows - 1) / 2) * ZONE_BLOCK.pitch,
      ratio,
      fillHeight: Math.max(ZONE_BLOCK.minFill, ratio) * ZONE_BLOCK.height,
    };
  });

  return {
    blocks,
    cols,
    rows,
    width,
    depth,
    floorWidth: width + FLOOR_MARGIN,
    floorDepth: depth + FLOOR_MARGIN,
    height: ZONE_BLOCK.height,
    shell: shellKindOf(tipo),
  };
}
