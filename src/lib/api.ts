const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface ApiUser {
  id: string;
  nombre: string;
  email: string;
  codigo_empleado: string;
  rol: "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";
  id_sede: string | null;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export interface DashboardKpis {
  ocupacion_global: number;
  alertas_activas: number;
  movimientos_hoy: number;
  proximo_vencimiento: number | null;
}

export interface DashboardGalpon {
  name: string;
  ocupacion_pct: number;
  ocup: number;
  estado: "disponible" | "medio" | "critico";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiSede {
  id: string;
  nombre: string;
  tipo: "ponton" | "planta" | "bodega";
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  capacidad_total: number | null;
  estado: string;
}

export interface ApiGalpon {
  id: string;
  nombre: string;
  codigo: string;
  id_sede: string;
  filas: number;
  columnas: number;
}

export interface ApiContainer {
  id: string;
  codigo: string;
  id_galpon: string;
  posicion_fila: number;
  posicion_col: number;
  estado: "disponible" | "medio" | "critico" | "mantenimiento" | "cuarentena";
  tipo_producto_permitido: string;
  capacidad_max: number;
  ocupacion_actual: number;
  unidad_medida: string;
}

export interface ApiAlerta {
  id: string;
  id_container: string;
  id_usuario_revision: string | null;
  tipo: string;
  severidad: string;
  descripcion: string;
  estado: string;
  fecha_generacion: string | null;
  fecha_revision: string | null;
}

export interface ApiProducto {
  id: string;
  nombre: string;
  codigo_barras: string;
  categoria: string;
  descripcion: string | null;
  unidad_medida: string;
  stock_minimo: number;
}

export interface ApiMovimientoListItem {
  id: string;
  id_container: string;
  id_container_destino: string | null;
  id_producto: string;
  id_usuario: string;
  id_usuario_aprobador: string | null;
  tipo: "entrada_proveedor" | "salida_produccion" | "traslado_interno" | "correccion";
  estado: "pendiente" | "aprobado" | "rechazado";
  cantidad: string;
  numero_lote: string;
  fecha_hora: string;
  fecha_aprobacion: string | null;
  fecha_vencimiento: string | null;
  nombre_proveedor: string | null;
  num_guia_despacho: string | null;
  registro_sanitario: string | null;
  temperatura_almacen: number | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
  origen: string;
  producto_nombre: string;
  container_codigo: string;
  container_destino_codigo: string | null;
  operario_nombre: string;
  aprobador_nombre: string | null;
  galpon_codigo: string;
}

export interface MovimientoPayload {
  id_container: string;
  id_producto: string;
  tipo: "entrada_proveedor" | "salida_produccion" | "traslado_interno";
  cantidad: number;
  numero_lote: string;
  fecha_fabricacion?: string;
  fecha_vencimiento: string;
  nombre_proveedor?: string;
  num_guia_despacho?: string;
  registro_sanitario?: string;
  temperatura_almacen?: number;
  num_receta_retenida?: string;
  num_autorizacion_sag?: string;
  id_container_destino?: string;
  observaciones?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? "No se pudo completar la solicitud");
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseJson<{
    status: string;
    environment: string;
    version: string;
  }>(response);
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJson<AuthTokens>(response);
}

export async function fetchMe(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<ApiUser>(response);
}

export async function fetchDashboardKpis(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/dashboard/kpis`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<DashboardKpis>(response);
}

export async function fetchDashboardGalpones(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/dashboard/ocupacion-por-galpon`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<DashboardGalpon[]>(response);
}

export async function fetchSedes(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/sedes`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiSede>>(response);
}

export async function fetchGalpones(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/galpones`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiGalpon>>(response);
}

export async function fetchContainers(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/containers?limit=500`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiContainer>>(response);
}

export async function fetchAlertasActivas(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/alertas/activas`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<ApiAlerta[]>(response);
}

export async function fetchProductos(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/productos?limit=500`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiProducto>>(response);
}

export async function fetchMovimientos(accessToken: string, query = "") {
  const suffix = query ? `?${query}` : "";
  const response = await fetch(`${API_BASE_URL}/movimientos${suffix}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiMovimientoListItem>>(response);
}

export async function createMovimiento(accessToken: string, payload: MovimientoPayload) {
  const response = await fetch(`${API_BASE_URL}/movimientos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<ApiMovimientoListItem>(response);
}

export async function approveMovimiento(accessToken: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/movimientos/${id}/aprobar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<ApiMovimientoListItem>(response);
}

export async function rejectMovimiento(accessToken: string, id: string, motivo_rechazo: string) {
  const response = await fetch(`${API_BASE_URL}/movimientos/${id}/rechazar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ motivo_rechazo }),
  });

  return parseJson<ApiMovimientoListItem>(response);
}
