import { apiFetch } from "./client";
import { Alert } from "../domain/alert";
import type { ApiAlerta } from "@/lib/api";

export async function fetchActiveAlerts(token: string): Promise<Alert[]> {
  try {
    return await apiFetch<Alert[]>("/api/v2/alertas/activas", { token });
  } catch {
    // Adaptador legacy /alertas/activas
    const legacy = await apiFetch<ApiAlerta[]>("/alertas/activas", { token });
    return legacy.map((a) => ({
      id: a.id,
      id_organizacion: "default",
      id_ubicacion: a.id_container,
      id_sitio: null,
      id_usuario_revision: a.id_usuario_revision,
      tipo: a.tipo,
      severidad: a.severidad,
      descripcion: a.descripcion,
      estado: a.estado,
      fecha_generacion: a.fecha_generacion,
      fecha_revision: a.fecha_revision,
    }));
  }
}
