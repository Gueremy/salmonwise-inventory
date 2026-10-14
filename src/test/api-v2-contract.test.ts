import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { approveMovement, createMovement, rejectMovement } from "@/api/movements";
import { fetchInconsistencies, fetchSupervisorKpis, uploadReconciliationFile } from "@/api/reconciliation";
import { fetchItems } from "@/api/items";
import { resolveAlert } from "@/api/alerts";

const fetchMock = vi.fn();
const json = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { "content-type": "application/json" },
});

describe("contratos API v2 compartidos con backend", () => {
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("crea y resuelve solicitudes con las rutas y métodos v2", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ id: "request-1", estado: "pendiente" })));
    const payload = { id_tipo_movimiento: "type-1", id_item: "item-1", cantidad: 2, unidad_medida: "kg" };
    await createMovement("token", payload);
    await approveMovement("token", "request-1");
    await rejectMovement("token", "request-1", "Stock inválido");

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v2/movimientos/solicitudes");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v2/movimientos/solicitudes/request-1/aprobar");
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(fetchMock.mock.calls[2][0]).toContain("/api/v2/movimientos/solicitudes/request-1/rechazar");
    expect(fetchMock.mock.calls[2][1].body).toBe('{"motivo":"Stock inválido"}');
  });

  it("mapea KPIs y discrepancias reales sin sustituir fallos por datos de ejemplo", async () => {
    fetchMock
      .mockResolvedValueOnce(json({
        capacidad_instalada: 10, stock_total: 4, ubicaciones_libres: 2,
        porcentaje_uso: 40, cantidad_inconsistencias: 1,
        capacidad_por_unidad: { kg: 10 }, stock_por_unidad: { kg: 4 },
        totales_comparables: true,
      }))
      .mockResolvedValueOnce(json([{
        id: "inc-1", tipo_inconsistencia: "sobrecapacidad", id_ubicacion: "loc-1",
        codigo_ubicacion: "A-1", motivo: "Excede capacidad", fecha_deteccion: "2026-01-01T00:00:00Z",
      }]));
    const kpis = await fetchSupervisorKpis("token");
    const items = await fetchInconsistencies("token");
    expect(kpis.stock_actual).toBe(4);
    expect(kpis.total_inconsistencias).toBe(1);
    expect(items[0].descripcion).toBe("Excede capacidad");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v2/dashboard/inconsistencias-recientes");

    fetchMock.mockRejectedValueOnce(new TypeError("network unavailable"));
    await expect(fetchSupervisorKpis("token")).rejects.toThrow("network unavailable");
  });

  it("envía archivo y mapeo con los nombres que recibe FastAPI", async () => {
    fetchMock.mockResolvedValue(json({ job: { id: "job-1", total_registros: 1, registros_inconsistentes: 0 }, inconsistencias: [] }));
    const file = new File(["POS,SKU,QTY\nA1,B1,2"], "inventario.csv", { type: "text/csv" });
    await uploadReconciliationFile("token", file, {
      codigo_ubicacion: "POS", codigo_item: "SKU", cantidad: "QTY",
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v2/importacion/conciliar");
    expect(options.method).toBe("POST");
    const form = options.body as FormData;
    expect(form.get("file")).toBe(file);
    expect(JSON.parse(String(form.get("mapeo_json"))).cantidad).toBe("QTY");
  });

  it("recorre las páginas de un catálogo sin ocultar ítems posteriores", async () => {
    fetchMock.mockResolvedValueOnce(json({ items: [{ id: "first" }], total: 101, pages: 2 }));
    fetchMock.mockResolvedValueOnce(json({ items: [{ id: "last" }], total: 101, pages: 2 }));
    expect((await fetchItems("token")).map((item) => item.id)).toEqual(["first", "last"]);
    expect(fetchMock.mock.calls[1][0]).toContain("page=2");
  });

  it("resuelve una alerta de sincronización desde el endpoint v2", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "alert-1", estado: "resuelta" }));
    await resolveAlert("token", "alert-1");
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v2/alertas/alert-1/resolver");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });
});
