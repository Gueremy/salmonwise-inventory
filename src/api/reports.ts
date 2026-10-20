import { API_BASE_URL } from "./client";

export interface ReportDownloadResult {
  blob: Blob;
  filename: string;
  sha256: string;
}

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

async function sha256FromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function downloadReport(
  token: string,
  kind: "pdf" | "excel" | "sernapesca",
  query = "",
  resource: "movimientos" | "inconsistencias" = "movimientos",
): Promise<ReportDownloadResult> {
  const endpoint = kind === "sernapesca"
    ? "/reportes/sernapesca"
    : `/api/v2/exportaciones/${resource}/${kind}`;
  const extension = kind === "pdf" ? "pdf" : "xlsx";
  const params = new URLSearchParams(query);
  if (kind !== "sernapesca") {
    params.set("size", "10000");
    params.set("page", "1");
  }
  const fetchPage = async (path = endpoint) => {
    const queryString = params.toString();
    const response = await fetch(`${API_BASE_URL}${path}${queryString ? `?${queryString}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.detail ?? "No se pudo generar el reporte");
    }
    return response;
  };
  let response = await fetchPage();

  const total = Number(response.headers.get("x-export-total") ?? 0);
  if (kind !== "sernapesca" && total > 10000) {
    params.delete("page");
    response = await fetchPage(`${endpoint}/completo`);
    if (response.headers.get("content-type")?.split(";")[0] !== "application/zip") {
      throw new Error("El servidor no entregó el archivo completo");
    }
  }

  const buffer = await response.arrayBuffer();
  const sha256 = await sha256FromArrayBuffer(buffer);
  const blob = new Blob([buffer], { type: response.headers.get("content-type") ?? "application/octet-stream" });
  const filename = filenameFromDisposition(
    response.headers.get("content-disposition"),
    total > 10000 && kind !== "sernapesca" ? `reporte-${resource}-completo.zip` : `reporte.${extension}`,
  );

  return { blob, filename, sha256 };
}
