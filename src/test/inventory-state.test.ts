import { describe, expect, it } from "vitest";
import { buildInventorySnapshot, ocupacionToEstado } from "@/lib/inventory";
import { DEFAULT_THEME } from "@/domain/organization";

const config = {
  umbrales: { disponible_max: 59, medio_max: 89, critico_min: 90 },
  colores: DEFAULT_THEME,
};

function location(estado: string, ocupacion_actual: number) {
  return {
    id: estado, codigo: estado, id_galpon: "zone", estado,
    capacidad_max: 100, ocupacion_actual, unidad_medida: "unidades",
    tipo_producto_permitido: "general", posicion_fila: 1, posicion_col: 1,
  } as never;
}

describe("estado visual del inventario", () => {
  it("usa los umbrales de la organización en listas y agregados", () => {
    expect(ocupacionToEstado(50, config)).toBe("disponible");
    expect(ocupacionToEstado(90, config)).toBe("critico");
  });

  it("no presenta Disponible al 100% y conserva estados administrativos", () => {
    const snapshot = buildInventorySnapshot({
      sedes: [], galpones: [], alertas: [], config,
      containers: [location("disponible", 100), location("mantenimiento", 100)],
    });
    expect(snapshot.containers.find((item) => item.id === "disponible")?.estado).toBe("critico");
    expect(snapshot.containers.find((item) => item.id === "mantenimiento")?.estado).toBe("mantenimiento");
  });
});
