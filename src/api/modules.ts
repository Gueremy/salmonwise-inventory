import { apiFetch } from "./client";
import { ModuleManifest } from "../domain/module";

export async function fetchModules(token: string): Promise<ModuleManifest[]> {
  return apiFetch<ModuleManifest[]>("/api/v2/modulos", { token });
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
