import { apiFetch, API_BASE_URL } from "./client";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface ApiUser {
  id: string;
  nombre: string;
  email: string;
  codigo_empleado: string;
  rol: "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";
  id_sede: string | null;
  id_organizacion?: string | null;
  turno: "A" | "B" | null;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
  permisos?: string[];
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Backend offline");
  }
  return response.json() as Promise<{
    status: string;
    environment: string;
    version: string;
  }>;
}

export async function login(username: string, password: string): Promise<AuthTokens> {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.detail ?? "Credenciales inválidas");
  }

  return response.json();
}

export async function fetchMe(token: string): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/me", { token });
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });
}

export async function logout(token: string, refreshTokenValue: string): Promise<void> {
  await apiFetch<void>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });
}
