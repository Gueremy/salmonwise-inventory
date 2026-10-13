export interface FrontendModuleDefinition {
  id: string;
  nombre: string;
  version: string;
  descripcion: string;
  habilitadoPorDefecto: boolean;
  requierePermiso?: string;
}

export const CATALOGO_MODULOS: Record<string, FrontendModuleDefinition> = {
  offline_sync: {
    id: "offline_sync",
    nombre: "Sincronización Offline PWA",
    version: "0.1.0",
    descripcion: "Sincronización transaccional y catálogo local en Dexie.js para clientes desconectados.",
    habilitadoPorDefecto: true,
  },
  importacion: {
    id: "importacion",
    nombre: "Importación y Conciliación ERP/WMS",
    version: "0.1.0",
    descripcion: "Ingesta masiva de archivos CSV/Excel y detección automática de inconsistencias físicas.",
    habilitadoPorDefecto: true,
  },
  pack_salmonero: {
    id: "pack_salmonero",
    nombre: "Pack Acuícola Salmonero",
    version: "0.1.0",
    descripcion: "Validaciones normativas SERNAPESCA y SAG, recetas retenidas y trazabilidad acuícola.",
    habilitadoPorDefecto: false,
  },
  fefo: {
    id: "fefo",
    nombre: "Estrategias de Picking Inteligente (FEFO / FIFO / LIFO)",
    version: "0.1.0",
    descripcion: "Algoritmos de rotación y extracción priorizada según fecha de vencimiento y antigüedad.",
    habilitadoPorDefecto: true,
  },
  layout_editor: {
    id: "layout_editor",
    nombre: "Editor de Layout Espacial 2D/3D",
    version: "0.1.0",
    descripcion: "Configuración y mapeo visual de coordenadas y dimensiones de zonas y ubicaciones.",
    habilitadoPorDefecto: true,
    requierePermiso: "sitio:write",
  },
};

export class FrontendModuleRegistry {
  static getAvailableModules(): FrontendModuleDefinition[] {
    return Object.values(CATALOGO_MODULOS);
  }

  static isModuleAvailable(moduleId: string): boolean {
    return moduleId in CATALOGO_MODULOS;
  }
}
