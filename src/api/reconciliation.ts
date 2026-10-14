import { apiFetch } from "./client";

export interface InconsistencyItem {
  id: string;
  tipo: string;
  id_ubicacion: string | null;
  ubicacion_codigo: string | null;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fecha_deteccion: string;
}

interface DashboardKpisResponse {
  capacidad_instalada: number;
  stock_total: number;
  ubicaciones_libres: number;
  porcentaje_uso: number;
  cantidad_inconsistencias: number;
  capacidad_por_unidad: Record<string, number>;
  stock_por_unidad: Record<string, number>;
  totales_comparables: boolean;
}

export interface SupervisorKpis {
  capacidad_instalada: number;
  stock_actual: number;
  ubicaciones_libres: number;
  porcentaje_uso: number;
  total_inconsistencias: number;
  capacidad_por_unidad: Record<string, number>;
  stock_por_unidad: Record<string, number>;
  totales_comparables: boolean;
}

interface BackendInconsistency {
  id: string;
  tipo_inconsistencia: string;
  id_ubicacion: string | null;
  codigo_ubicacion: string | null;
  motivo: string;
  fecha_deteccion: string;
}

export async function fetchSupervisorKpis(token: string): Promise<SupervisorKpis> {
  const data = await apiFetch<DashboardKpisResponse>("/api/v2/dashboard/kpis", { token });
  return {
    capacidad_instalada: Number(data.capacidad_instalada),
    stock_actual: Number(data.stock_total),
    ubicaciones_libres: data.ubicaciones_libres,
    porcentaje_uso: data.porcentaje_uso,
    total_inconsistencias: data.cantidad_inconsistencias,
    capacidad_por_unidad: data.capacidad_por_unidad,
    stock_por_unidad: data.stock_por_unidad,
    totales_comparables: data.totales_comparables,
  };
}

export async function fetchInconsistencies(token: string): Promise<InconsistencyItem[]> {
  const data = await apiFetch<BackendInconsistency[]>("/api/v2/dashboard/inconsistencias-recientes", {
    token,
    params: { limit: 50 },
  });
  return data.map((item) => ({
    id: item.id,
    tipo: item.tipo_inconsistencia,
    id_ubicacion: item.id_ubicacion,
    ubicacion_codigo: item.codigo_ubicacion,
    descripcion: item.motivo,
    severidad: item.tipo_inconsistencia === "sobrecapacidad" ? "alta" : "media",
    fecha_deteccion: item.fecha_deteccion,
  }));
}

export async function fetchJobInconsistencies(token: string, jobId: string): Promise<InconsistencyItem[]> {
  const data = await apiFetch<BackendInconsistency[]>(`/api/v2/importacion/jobs/${jobId}/inconsistencias`, { token });
  return data.map((item) => ({
    id: item.id,
    tipo: item.tipo_inconsistencia,
    id_ubicacion: item.id_ubicacion,
    ubicacion_codigo: item.codigo_ubicacion,
    descripcion: item.motivo,
    severidad: item.tipo_inconsistencia === "sobrecapacidad" ? "alta" : "media",
    fecha_deteccion: item.fecha_deteccion,
  }));
}

export interface ImportMapping {
  codigo_ubicacion: string;
  codigo_item: string;
  cantidad: string;
  numero_lote?: string;
  codigo_sitio?: string;
  codigo_zona?: string;
}

export interface ImportPreview {
  columnas: string[];
  filas: Array<Record<string, string>>;
  total_filas: number;
}

export interface MappingProfile {
  id: string;
  nombre: string;
  mapeo: ImportMapping;
}

export function previewReconciliationFile(token: string, file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ImportPreview>("/api/v2/importacion/previsualizar", {
    method: "POST", token, body: formData,
  });
}

export function fetchMappingProfiles(token: string): Promise<MappingProfile[]> {
  return apiFetch<MappingProfile[]>("/api/v2/importacion/mapeos", { token });
}

export function createMappingProfile(token: string, nombre: string, mapeo: ImportMapping): Promise<MappingProfile> {
  return apiFetch<MappingProfile>("/api/v2/importacion/mapeos", {
    method: "POST", token, body: JSON.stringify({ nombre, mapeo }),
  });
}

export interface ReconciliationResult {
  job: { id: string; total_registros: number; registros_inconsistentes: number };
  inconsistencias: BackendInconsistency[];
}

export async function uploadReconciliationFile(
  token: string,
  file: File,
  mapping?: ImportMapping,
  profileId?: string,
): Promise<ReconciliationResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (profileId) formData.append("id_mapping_profile", profileId);
  else if (mapping) formData.append("mapeo_json", JSON.stringify(mapping));
  return apiFetch<ReconciliationResult>("/api/v2/importacion/conciliar", {
    method: "POST",
    token,
    body: formData,
  });
}
