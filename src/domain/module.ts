export interface ModuleManifest {
  id: string; // ej: "pack_salmonero", "offline_sync", "importacion", "fefo"
  nombre: string;
  version: string;
  descripcion: string;
  habilitado: boolean;
  rutas_api?: string;
  configuracion?: Record<string, unknown>;
}
