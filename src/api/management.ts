import { apiFetch } from "./client";

export interface ManagementSummary {
  movimientos_diarios: Array<{
    fecha: string;
    entradas: number;
    salidas: number;
    traslados: number;
    total: number;
  }>;
  top_items: Array<{ id_item: string; nombre: string; movimientos: number }>;
}

export function fetchManagementSummary(token: string): Promise<ManagementSummary> {
  return apiFetch<ManagementSummary>("/api/v2/dashboard/gerencia", { token });
}
