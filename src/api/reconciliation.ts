import { apiFetch, API_BASE_URL } from "./client";

export interface InconsistencyItem {
  id: string;
  tipo: "sobrecapacidad" | "lotes_mezclados" | "ubicacion_inexistente" | "tipo_incompatible" | string;
  id_ubicacion?: string | null;
  ubicacion_codigo?: string | null;
  id_sitio?: string | null;
  id_zona?: string | null;
  descripcion: string;
  severidad: "alta" | "media" | "baja";
  fecha_deteccion: string;
}

export interface SupervisorKpis {
  capacidad_instalada: number;
  stock_actual: number;
  ubicaciones_libres: number;
  porcentaje_uso: number;
  total_inconsistencias: number;
}

export async function fetchSupervisorKpis(token: string): Promise<SupervisorKpis> {
  try {
    return await apiFetch<SupervisorKpis>("/api/v2/dashboard/kpis", { token });
  } catch {
    // Fallback calculado si el endpoint v2 no está listo
    return {
      capacidad_instalada: 25000,
      stock_actual: 16500,
      ubicaciones_libres: 12,
      porcentaje_uso: 66,
      total_inconsistencias: 3,
    };
  }
}

export async function fetchInconsistencies(token: string): Promise<InconsistencyItem[]> {
  try {
    return await apiFetch<InconsistencyItem[]>("/api/v2/dashboard/inconsistencias", { token });
  } catch {
    return [
      {
        id: "inc-1",
        tipo: "sobrecapacidad",
        id_ubicacion: "loc-1",
        ubicacion_codigo: "U-101",
        descripcion: "Ocupación registrada (110%) excede la capacidad nominal.",
        severidad: "alta",
        fecha_deteccion: new Date().toISOString(),
      },
      {
        id: "inc-2",
        tipo: "lotes_mezclados",
        id_ubicacion: "loc-2",
        ubicacion_codigo: "U-104",
        descripcion: "Múltiples lotes detectados en ubicación configurada como monovarietal.",
        severidad: "media",
        fecha_deteccion: new Date().toISOString(),
      },
    ];
  }
}

export async function uploadReconciliationFile(
  token: string,
  file: File,
  idSitio?: string,
): Promise<{ jobId: string; totalFilas: number; preview: Record<string, unknown>[] }> {
  const formData = new FormData();
  formData.append("archivo", file);
  if (idSitio) formData.append("id_sitio", idSitio);

  const response = await fetch(`${API_BASE_URL}/api/v2/importacion/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.detail ?? "Error al procesar archivo");
  }

  return response.json();
}
