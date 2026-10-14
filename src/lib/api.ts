import { approveMovement, fetchMovementRequests, rejectMovement } from "@/api/movements";
import { apiFetch } from "@/api/client";

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
  turno: "A" | "B" | null;
  activo: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  email?: string;
  codigo_empleado?: string;
  rol?: ApiUser["rol"];
  id_sede?: string | null;
  turno?: "A" | "B" | null;
  activo?: boolean;
}

export interface DashboardKpis {
  ocupacion_global: number;
  alertas_activas: number;
  total_items: number;
  ubicaciones_libres: number;
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
  tipo: string;
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

export interface ApiMovimientoRead {
  id: string;
  id_container: string;
  id_producto: string;
  id_usuario: string;
  id_usuario_aprobador: string | null;
  tipo: "entrada_proveedor" | "salida_produccion" | "traslado_interno" | "correccion";
  estado: "pendiente" | "aprobado" | "rechazado";
  cantidad: string;
  numero_lote: string;
  fecha_fabricacion: string | null;
  fecha_vencimiento: string | null;
  nombre_proveedor: string | null;
  num_guia_despacho: string | null;
  registro_sanitario: string | null;
  temperatura_almacen: number | null;
  num_receta_retenida: string | null;
  num_autorizacion_sag: string | null;
  fecha_hora: string;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  observaciones: string | null;
  origen: string;
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

export interface ReportDownloadResult {
  blob: Blob;
  filename: string;
  sha256: string;
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

export async function fetchUsuarios(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/usuarios/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJson<PaginatedResponse<ApiUser>>(response);
}

export async function updateUsuario(accessToken: string, id: string, payload: UpdateUsuarioPayload) {
  const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<ApiUser>(response);
}

export async function asignarGalponesUsuario(accessToken: string, id: string, galponesIds: string[]) {
  const response = await fetch(`${API_BASE_URL}/usuarios/${id}/asignar-galpones`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(galponesIds),
  });

  return parseJson<{ mensaje: string }>(response);
}

export async function fetchDashboardKpis(accessToken: string) {
  const data = await apiFetch<{
    porcentaje_uso: number; alertas_activas: number; total_items: number; ubicaciones_libres: number;
  }>("/api/v2/dashboard/kpis", { token: accessToken });
  return {
    ocupacion_global: data.porcentaje_uso,
    alertas_activas: data.alertas_activas,
    total_items: data.total_items,
    ubicaciones_libres: data.ubicaciones_libres,
  } satisfies DashboardKpis;
}

export async function fetchDashboardGalpones(accessToken: string) {
  const data = await apiFetch<Array<{ codigo: string; porcentaje_ocupacion: number }>>(
    "/api/v2/dashboard/ocupacion", { token: accessToken },
  );
  return data.map((location) => ({
    name: location.codigo,
    ocupacion_pct: location.porcentaje_ocupacion,
    ocup: location.porcentaje_ocupacion,
    estado: location.porcentaje_ocupacion >= 80 ? "critico" : location.porcentaje_ocupacion >= 40 ? "medio" : "disponible",
  })) satisfies DashboardGalpon[];
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
  const data = await apiFetch<Array<{
    id: string; id_ubicacion: string | null; id_usuario_revision: string | null;
    tipo: string; severidad: string; descripcion: string; estado: string;
    fecha_generacion: string | null; fecha_revision: string | null;
  }>>("/api/v2/alertas/activas", { token: accessToken });
  return data.map((alert) => ({ ...alert, id_container: alert.id_ubicacion ?? "" })) satisfies ApiAlerta[];
}

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

async function sha256FromArrayBuffer(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function downloadReporte(
  accessToken: string,
  type: "pdf" | "excel" | "sernapesca",
  query = "",
): Promise<ReportDownloadResult> {
  const endpoint = type === "pdf" ? "/reportes/movimientos/pdf" : type === "excel" ? "/reportes/movimientos/excel" : "/reportes/sernapesca";
  const suffix = query ? `?${query}` : "";
  const response = await fetch(`${API_BASE_URL}${endpoint}${suffix}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? "No se pudo descargar el reporte");
  }

  const buffer = await response.arrayBuffer();
  const extension = type === "pdf" ? "pdf" : "xlsx";
  return {
    blob: new Blob([buffer], { type: response.headers.get("content-type") ?? "application/octet-stream" }),
    filename: filenameFromDisposition(response.headers.get("content-disposition"), `reporte.${extension}`),
    sha256: await sha256FromArrayBuffer(buffer),
  };
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
  const params = new URLSearchParams(query);
  const size = Math.min(Number(params.get("limit") || params.get("size") || 100), 100);
  const page = Number(params.get("page") || 1);
  const estado = params.get("estado");
  const pendientes = params.get("pendientes");
  const requestParams = new URLSearchParams({ page: String(page), size: String(size) });
  if (estado) requestParams.set("estado", estado);
  if (pendientes) requestParams.set("pendientes", pendientes);
  const result = await fetchMovementRequests(accessToken, requestParams.toString());
  const items: ApiMovimientoListItem[] = result.items.map((request) => ({
    id: request.id,
    id_container: request.id_ubicacion_origen ?? request.id_ubicacion_destino ?? "",
    id_container_destino: request.id_ubicacion_destino ?? null,
    id_producto: request.id_item,
    id_usuario: request.id_usuario_solicitante,
    id_usuario_aprobador: request.id_usuario_aprobador,
    tipo: request.id_tipo_movimiento,
    estado: request.fecha_resolucion
      ? request.motivo_rechazo ? "rechazado" : "aprobado"
      : "pendiente",
    cantidad: String(request.cantidad),
    numero_lote: request.id_lote ?? "—",
    fecha_hora: request.fecha_creacion,
    fecha_aprobacion: request.fecha_resolucion,
    fecha_vencimiento: null,
    nombre_proveedor: null,
    num_guia_despacho: null,
    registro_sanitario: null,
    temperatura_almacen: null,
    motivo_rechazo: request.motivo_rechazo,
    observaciones: request.observaciones ?? null,
    origen: "v2",
    producto_nombre: request.id_item,
    container_codigo: request.id_ubicacion_origen ?? request.id_ubicacion_destino ?? "—",
    container_destino_codigo: request.id_ubicacion_destino ?? null,
    operario_nombre: request.id_usuario_solicitante,
    aprobador_nombre: request.id_usuario_aprobador,
    galpon_codigo: "",
  }));
  const search = params.get("q")?.toLowerCase();
  const filtered = search ? items.filter((item) => [item.producto_nombre, item.numero_lote, item.container_codigo, item.operario_nombre]
    .some((value) => value.toLowerCase().includes(search))) : items;
  return { ...result, items: filtered, total: search ? filtered.length : result.total };
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

  return parseJson<ApiMovimientoRead>(response);
}

export async function approveMovimiento(accessToken: string, id: string) {
  return approveMovement(accessToken, id);
}

export async function rejectMovimiento(accessToken: string, id: string, motivo_rechazo: string) {
  return rejectMovement(accessToken, id, motivo_rechazo);
}
