import { apiFetch } from "./client";
import { ModuleManifest } from "../domain/module";

export async function fetchModules(token: string): Promise<ModuleManifest[]> {
  try {
    return await apiFetch<ModuleManifest[]>("/api/v2/modulos", { token });
  } catch {
    // Catálogo por defecto si el endpoint aún no está expuesto
    return [
      {
        id: "offline_sync",
        nombre: "Sincronización Offline PWA",
        version: "0.1.0",
        descripcion: "Sincronización transaccional con idempotencia para clientes desconectados.",
        habilitado: true,
      },
      {
        id: "importacion",
        nombre: "Importación y Conciliación ERP/WMS",
        version: "0.1.0",
        descripcion: "Motor de ingesta de CSV/Excel y detección de inconsistencias de stock.",
        habilitado: true,
      },
      {
        id: "pack_salmonero",
        nombre: "Pack Acuícola Salmonero",
        version: "0.1.0",
        descripcion: "Extensión de validaciones regulatorias SAG/SERNAPESCA y trazabilidad salmonera.",
        habilitado: false,
      },
      {
        id: "fefo",
        nombre: "Estrategias de Picking Inteligente (FEFO / FIFO / LIFO)",
        version: "0.1.0",
        descripcion: "Sugerencias de extracción optimizadas por fecha de vencimiento y antigüedad.",
        habilitado: true,
      },
    ];
  }
}

export async function updateModuleStatus(
  token: string,
  id: string,
  habilitado: boolean,
  configuracion: Record<string, unknown> = {},
): Promise<ModuleManifest> {
  return apiFetch<ModuleManifest>(`/api/v2/modulos/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ habilitado, configuracion }),
  });
}
