export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

let onUnauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandler = handler;
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, params, headers, ...rest } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };

  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  if (rest.body && !(rest.body instanceof FormData) && !(rest.body instanceof URLSearchParams)) {
    if (!reqHeaders["Content-Type"]) {
      reqHeaders["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: reqHeaders,
  });

  if (response.status === 401) {
    onUnauthorizedHandler?.();
  }

  if (!response.ok) {
    let errorDetail = "Error de red o del servidor";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail ?? errorJson.message ?? errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json() as Promise<T>;
}
