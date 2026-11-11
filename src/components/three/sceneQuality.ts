/**
 * Perfil gráfico del dispositivo y detección de WebGL.
 * El perfil "low" apunta a tablets Android de gama baja y PC con gráfica integrada.
 */

export type QualityTier = "low" | "high";

export interface QualityProfile {
  tier: QualityTier;
  /** Límite de resolución (devicePixelRatio). */
  maxDpr: number;
  /** Resolución mientras se mueve la cámara. */
  movingDpr: number;
  /**
   * Presupuesto de triángulos de una zona. Sobre este valor las pilas bajan de detalle.
   * Es el ajuste a tocar si una zona grande no llega a 30 FPS en el equipo objetivo.
   */
  cargoTriangleBudget: number;
  antialias: boolean;
  /** Lado máximo de la textura con los códigos de ubicación. */
  labelTextureSize: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { tier: "low", maxDpr: 1.5, movingDpr: 1, cargoTriangleBudget: 70_000, antialias: false, labelTextureSize: 2048 },
  high: { tier: "high", maxDpr: 2, movingDpr: 2, cargoTriangleBudget: 300_000, antialias: true, labelTextureSize: 3072 },
};

export interface DeviceSignals {
  cores?: number;
  memoryGb?: number;
  coarsePointer?: boolean;
  saveData?: boolean;
  /** Preferencia explícita (para medir en terreno): gana sobre la detección. */
  override?: string | null;
}

export function resolveQualityProfile(signals: DeviceSignals): QualityProfile {
  if (signals.override === "low" || signals.override === "high") return QUALITY_PROFILES[signals.override];
  const limited =
    signals.saveData === true ||
    signals.coarsePointer === true ||
    (typeof signals.cores === "number" && signals.cores <= 4) ||
    (typeof signals.memoryGb === "number" && signals.memoryGb <= 4);
  return QUALITY_PROFILES[limited ? "low" : "high"];
}

/** Clave de localStorage para forzar el perfil: "low" o "high". */
export const QUALITY_OVERRIDE_KEY = "salmotrack.3d.calidad";

export function readDeviceSignals(): DeviceSignals {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let override: string | null = null;
  try {
    override = localStorage.getItem(QUALITY_OVERRIDE_KEY);
  } catch {
    // Sin acceso a almacenamiento: se usa la detección.
  }
  return {
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    coarsePointer: typeof matchMedia === "function" ? matchMedia("(pointer: coarse)").matches : undefined,
    saveData: nav.connection?.saveData,
    override,
  };
}

export const deviceQualityProfile = () => resolveQualityProfile(readDeviceSignals());

/** Resolución del lienzo: limitada por el perfil y reducida mientras se mueve la cámara. */
export function sceneDpr(profile: QualityProfile, moving: boolean): number | [number, number] {
  return moving && profile.movingDpr < profile.maxDpr ? profile.movingDpr : [1, profile.maxDpr];
}

let webglSupport: boolean | null = null;

/** Comprueba una sola vez si el navegador puede crear un contexto WebGL. */
export function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webglSupport = Boolean(context);
    // Se libera el contexto de prueba: los navegadores limitan cuántos hay a la vez.
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}
