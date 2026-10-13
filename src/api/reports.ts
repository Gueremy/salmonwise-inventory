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
): Promise<ReportDownloadResult> {
  let endpoint = "/reportes/movimientos/pdf";
  let extension = "pdf";

  if (kind === "excel") {
    endpoint = "/reportes/movimientos/excel";
    extension = "xlsx";
  } else if (kind === "sernapesca") {
    endpoint = "/reportes/sernapesca";
    extension = "xlsx";
  }

  const url = `${API_BASE_URL}${endpoint}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.detail ?? "No se pudo generar el reporte");
  }

  const buffer = await response.arrayBuffer();
  const sha256 = await sha256FromArrayBuffer(buffer);
  const blob = new Blob([buffer], { type: response.headers.get("content-type") ?? "application/octet-stream" });
  const filename = filenameFromDisposition(response.headers.get("content-disposition"), `reporte.${extension}`);

  return { blob, filename, sha256 };
}
