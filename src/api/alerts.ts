import { apiFetch } from "./client";
import { Alert } from "../domain/alert";

export async function fetchActiveAlerts(token: string): Promise<Alert[]> {
  return apiFetch<Alert[]>("/api/v2/alertas/activas", { token });
}
