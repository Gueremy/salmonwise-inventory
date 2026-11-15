/**
 * Rótulos pintados en el piso: todos los textos de una escena van en una sola textura,
 * en lugar de una etiqueta HTML por elemento.
 */
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import { SCENE_COLORS } from "./sceneColors";

export interface FloorLabel {
  text: string;
  /** Centro del texto en coordenadas de escena. */
  x: number;
  z: number;
  /** Ancho y alto disponibles, en unidades de escena. */
  width: number;
  height: number;
}

export interface LabelAtlas {
  width: number;
  height: number;
  pixelsPerUnit: number;
}

/** Texto más chico que esto no se lee: es mejor no gastar memoria en la textura. */
export const MIN_LABEL_FONT_PX = 9;

/** Tamaño de la textura que cubre un piso de `width` x `depth`, sin pasar de `maxSize` por lado. */
export function labelAtlas(width: number, depth: number, maxSize: number, targetPixelsPerUnit = 96): LabelAtlas {
  const pixelsPerUnit = Math.min(targetPixelsPerUnit, maxSize / Math.max(width, depth, 0.001));
  return {
    width: Math.max(1, Math.round(width * pixelsPerUnit)),
    height: Math.max(1, Math.round(depth * pixelsPerUnit)),
    pixelsPerUnit,
  };
}

/** Tamaño de letra con que cabe `text`, o 0 si quedaría ilegible. */
export function labelFontSize(text: string, label: Pick<FloorLabel, "width" | "height">, pixelsPerUnit: number): number {
  const byHeight = label.height * pixelsPerUnit * 0.82;
  const byWidth = (label.width * pixelsPerUnit) / Math.max(1, text.length * 0.62);
  const size = Math.floor(Math.min(byHeight, byWidth));
  return size >= MIN_LABEL_FONT_PX ? size : 0;
}

/**
 * Dibuja los rótulos en una textura para un plano horizontal de `width` x `depth`
 * centrado en el origen. Devuelve null si no hay lienzo 2D o si nada sería legible.
 */
export function createFloorLabelTexture(
  labels: readonly FloorLabel[],
  bounds: { width: number; depth: number },
  maxSize: number,
): CanvasTexture | null {
  if (labels.length === 0 || typeof document === "undefined") return null;
  const atlas = labelAtlas(bounds.width, bounds.depth, maxSize);
  const sized = labels.map((label) => ({ label, font: labelFontSize(label.text, label, atlas.pixelsPerUnit) }));
  if (!sized.some((entry) => entry.font > 0)) return null;

  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.fillStyle = SCENE_COLORS.labelText;
  context.strokeStyle = SCENE_COLORS.labelOutline;
  let currentFont = 0;
  for (const { label, font } of sized) {
    if (font === 0) continue;
    if (font !== currentFont) {
      context.font = `700 ${font}px ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif`;
      context.lineWidth = Math.max(2, font * 0.22);
      currentFont = font;
    }
    const x = (label.x + bounds.width / 2) * atlas.pixelsPerUnit;
    const y = (label.z + bounds.depth / 2) * atlas.pixelsPerUnit;
    context.strokeText(label.text, x, y);
    context.fillText(label.text, x, y);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}
