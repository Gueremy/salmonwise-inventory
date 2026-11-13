/**
 * Utilidades comunes de las escenas: encuadre de cámara, escritura de mallas
 * instanciadas y recuperación del contexto gráfico.
 */
import { Color, Matrix4, type InstancedMesh } from "three";
import { INSTANCE_STRIDE } from "./zoneLayout";

export interface SceneBounds {
  width: number;
  depth: number;
  height: number;
}

export interface CameraFit {
  position: [number, number, number];
  target: [number, number, number];
  near: number;
  far: number;
  minDistance: number;
  maxDistance: number;
}

export const CAMERA_FOV = 42;

/** Dirección desde la que se mira la escena: casi de frente, para leer los códigos del piso. */
const VIEW_DIRECTION = (() => {
  const x = 0.3;
  const y = 0.78;
  const z = 1;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length] as const;
})();

/** Coloca la cámara para que la escena completa quepa en el lienzo, sea apaisado o vertical. */
export function fitCamera(bounds: SceneBounds, aspect: number, fovDegrees = CAMERA_FOV): CameraFit {
  const radius = Math.max(1.5, Math.hypot(bounds.width, bounds.depth, bounds.height) / 2);
  const vertical = (fovDegrees * Math.PI) / 180;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * safeAspect);
  const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.02;
  const targetY = bounds.height * 0.3;
  return {
    position: [VIEW_DIRECTION[0] * distance, targetY + VIEW_DIRECTION[1] * distance, VIEW_DIRECTION[2] * distance],
    target: [0, targetY, 0],
    // El plano cercano acompaña al tamaño de la escena para conservar precisión de profundidad.
    near: Math.max(0.1, radius / 40),
    far: distance * 4 + radius * 2,
    minDistance: Math.max(2.5, radius * 0.25),
    maxDistance: distance * 1.8,
  };
}

/** Capacidad de una malla instanciada: crece de a tramos para no recrearla en cada cambio. */
export function instanceCapacity(count: number): number {
  let capacity = 16;
  while (capacity < count) capacity *= 2;
  return capacity;
}

const matrix = new Matrix4();
const color = new Color();

function finishTransforms(mesh: InstancedMesh, count: number) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  // La selección y el descarte por cámara dependen de estos volúmenes.
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

/** Escribe instancias empaquetadas como x, y, z, ancho, alto, fondo. */
export function writeBoxInstances(mesh: InstancedMesh, packed: ArrayLike<number>) {
  const count = Math.floor(packed.length / INSTANCE_STRIDE);
  for (let index = 0; index < count; index += 1) {
    const offset = index * INSTANCE_STRIDE;
    matrix.makeScale(packed[offset + 3], packed[offset + 4], packed[offset + 5]);
    matrix.setPosition(packed[offset], packed[offset + 1], packed[offset + 2]);
    mesh.setMatrixAt(index, matrix);
  }
  finishTransforms(mesh, count);
}

/** Escribe instancias sin escala, empaquetadas como x, z (a la altura `y`). */
export function writeFlatInstances(mesh: InstancedMesh, packed: ArrayLike<number>, y = 0) {
  const count = Math.floor(packed.length / 2);
  for (let index = 0; index < count; index += 1) {
    matrix.makeTranslation(packed[index * 2], y, packed[index * 2 + 1]);
    mesh.setMatrixAt(index, matrix);
  }
  finishTransforms(mesh, count);
}

/** Pinta cada instancia reutilizando un único objeto de color. */
export function writeInstanceColors(mesh: InstancedMesh, colors: ArrayLike<string>) {
  for (let index = 0; index < colors.length; index += 1) {
    mesh.setColorAt(index, color.set(colors[index]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * Si el sistema le quita el contexto gráfico a la pestaña (memoria, cambio de app),
 * se permite restaurarlo; si no vuelve a tiempo se avisa para pasar a la vista 2D.
 */
export function watchContextLoss(
  canvas: HTMLCanvasElement,
  handlers: { onRestored: () => void; onUnrecoverable: () => void; timeoutMs?: number },
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const lost = (event: Event) => {
    event.preventDefault();
    clearTimeout(timer);
    timer = setTimeout(handlers.onUnrecoverable, handlers.timeoutMs ?? 4000);
  };
  const restored = () => {
    clearTimeout(timer);
    handlers.onRestored();
  };
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return () => {
    clearTimeout(timer);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
  };
}
