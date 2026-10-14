import { API_BASE_URL } from "./client";
import { zipSync } from "fflate";

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
  const fetchPage = async () => {
    const queryString = params.toString();
    const response = await fetch(`${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.detail ?? "No se pudo generar el reporte");
    }
    return response;
  };
  const response = await fetchPage();

  const total = Number(response.headers.get("x-export-total") ?? 0);
  if (kind !== "sernapesca" && total > 10000) {
    const files: Record<string, Uint8Array> = {};
    files[`pagina-001.${extension}`] = new Uint8Array(await response.arrayBuffer());
    for (let page = 2; page <= Math.ceil(total / 10000); page++) {
      params.set("page", String(page));
      const next = await fetchPage();
      if (Number(next.headers.get("x-export-total")) !== total) {
        throw new Error("Los datos cambiaron durante la exportación. Vuelve a generar el reporte.");
      }
      files[`pagina-${String(page).padStart(3, "0")}.${extension}`] = new Uint8Array(await next.arrayBuffer());
    }
    const archive = zipSync(files, { level: 0 });
    const buffer = archive.slice().buffer;
    return {
      blob: new Blob([buffer], { type: "application/zip" }),
      filename: `reporte-${resource}-completo.zip`,
      sha256: await sha256FromArrayBuffer(buffer),
    };
  }

  const buffer = await response.arrayBuffer();
  const sha256 = await sha256FromArrayBuffer(buffer);
  const blob = new Blob([buffer], { type: response.headers.get("content-type") ?? "application/octet-stream" });
  const filename = filenameFromDisposition(response.headers.get("content-disposition"), `reporte.${extension}`);

  return { blob, filename, sha256 };
}
