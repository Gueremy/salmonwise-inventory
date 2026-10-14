import { webcrypto } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadReport } from "@/api/reports";

afterEach(() => vi.unstubAllGlobals());

describe("exportación completa por páginas", () => {
  it("incluye las páginas posteriores a 10000 filas en un ZIP", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("primera", { headers: { "x-export-total": "10001" } }))
      .mockResolvedValueOnce(new Response("segunda", { headers: { "x-export-total": "10001" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadReport("token", "excel");
    const buffer = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(result.blob);
    });
    const files = unzipSync(new Uint8Array(buffer));
    expect(strFromU8(files["pagina-001.xlsx"])).toBe("primera");
    expect(strFromU8(files["pagina-002.xlsx"])).toBe("segunda");
    expect(fetchMock.mock.calls[1][0]).toContain("page=2");
    expect(result.filename).toMatch(/\.zip$/);
    expect(result.sha256).toHaveLength(64);
  });

  it("rechaza una exportación cuyo total cambia entre páginas", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("primera", { headers: { "x-export-total": "10001" } }))
      .mockResolvedValueOnce(new Response("segunda", { headers: { "x-export-total": "10002" } })));
    await expect(downloadReport("token", "pdf")).rejects.toThrow("Los datos cambiaron");
  });
});
