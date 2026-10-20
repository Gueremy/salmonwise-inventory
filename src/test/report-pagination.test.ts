import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadReport } from "@/api/reports";

afterEach(() => vi.unstubAllGlobals());

describe("exportación completa por instantánea", () => {
  it("descarga del servidor un ZIP consistente para más de 10000 filas", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const archive = new Uint8Array([80, 75, 3, 4, 1, 2, 3]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("primera", { headers: { "x-export-total": "10001" } }))
      .mockResolvedValueOnce(new Response(archive.buffer, {
        headers: { "content-type": "application/zip", "content-disposition": "attachment; filename=movimientos_completo.zip" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadReport("token", "excel");
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(result.blob);
    });
    expect(new Uint8Array(buffer)).toEqual(archive);
    expect(fetchMock.mock.calls[1][0]).toContain("/movimientos/excel/completo");
    expect(result.filename).toBe("movimientos_completo.zip");
    expect(result.sha256).toHaveLength(64);
  });

  it("rechaza si el servidor no devuelve un ZIP completo", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("primera", { headers: { "x-export-total": "10001" } }))
      .mockResolvedValueOnce(new Response("segunda", { headers: { "content-type": "application/pdf" } })));
    await expect(downloadReport("token", "pdf")).rejects.toThrow("archivo completo");
  });
});
