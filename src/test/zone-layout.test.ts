import { describe, expect, it } from "vitest";
import {
  buildZoneModel,
  chooseDetail,
  estimateTriangles,
  INSTANCE_STRIDE,
  layoutGrid,
  maxUnitsOf,
  resolveCargoKind,
  unitsFor,
  type ZoneLocationInput,
} from "@/components/three/zoneLayout";
import { buildSiteModel } from "@/components/three/siteLayout";
import { fitCamera } from "@/components/three/sceneSetup";
import { QUALITY_PROFILES, resolveQualityProfile } from "@/components/three/sceneQuality";
import { labelFontSize } from "@/components/three/floorLabels";
import { locationContentIndex } from "@/hooks/use-inventory-snapshot";

const location = (index: number, extra: Partial<ZoneLocationInput> = {}): ZoneLocationInput => ({
  id: `loc-${index}`,
  codigo: `P${String(index).padStart(4, "0")}`,
  ratio: 0.5,
  ...extra,
});

const cellKeys = (cells: Array<{ col: number; row: number }>) => new Set(cells.map((cell) => `${cell.col}:${cell.row}`));

describe("tipo de carga", () => {
  it("decide primero por la categoría del ítem", () => {
    expect(resolveCargoKind({ categoria: "Químicos", tipoProducto: "alimento", nombre: "Caja", unidad: "kg" })).toBe("tambor");
    expect(resolveCargoKind({ categoria: "Alimento", unidad: "unidades" })).toBe("saco");
    expect(resolveCargoKind({ categoria: "Alimento a granel" })).toBe("granel");
  });

  it("sigue con el tipo permitido, el nombre y por último la unidad", () => {
    expect(resolveCargoKind({ categoria: "general", tipoProducto: "veterinario" })).toBe("caja");
    expect(resolveCargoKind({ categoria: null, tipoProducto: "general", nombre: "Desinfectante 200 L" })).toBe("tambor");
    expect(resolveCargoKind({ unidad: "litros" })).toBe("tambor");
    expect(resolveCargoKind({ unidad: "ton" })).toBe("granel");
    expect(resolveCargoKind({ unidad: "kg" })).toBe("saco");
    expect(resolveCargoKind({})).toBe("caja");
  });
});

describe("grilla de la zona", () => {
  it("usa la fila y columna registradas cuando no se repiten", () => {
    const grid = layoutGrid([{ fila: 0, col: 0 }, { fila: 0, col: 1 }, { fila: 1, col: 0 }, { fila: 1, col: 1 }]);
    expect(grid.source).toBe("registrada");
    expect([grid.cols, grid.rows]).toEqual([2, 2]);
  });

  it("pasa a las coordenadas del editor si todas las posiciones registradas son iguales", () => {
    const grid = layoutGrid([
      { fila: 0, col: 0, x: 0, z: 0 },
      { fila: 0, col: 0, x: 2, z: 0 },
      { fila: 0, col: 0, x: 0, z: 2 },
    ]);
    expect(grid.source).toBe("editor");
    expect(cellKeys(grid.cells).size).toBe(3);
  });

  it("arma una grilla compacta sin superponer cuando no hay datos de posición", () => {
    const count = 1000;
    const grid = layoutGrid(Array.from({ length: count }, () => ({ fila: 0, col: 0 })));
    expect(grid.source).toBe("compacta");
    expect(cellKeys(grid.cells).size).toBe(count);
    expect(grid.cols * grid.rows).toBeGreaterThanOrEqual(count);
    expect(grid.cols).toBeGreaterThan(4);
  });
});

describe("pilas y nivel de detalle", () => {
  it("la cantidad de unidades crece con la ocupación", () => {
    expect(unitsFor("caja", 0)).toBe(0);
    expect(unitsFor("caja", 0.01)).toBe(1);
    expect(unitsFor("caja", 0.5)).toBeLessThan(unitsFor("caja", 1));
    expect(unitsFor("caja", 7)).toBe(maxUnitsOf("caja"));
  });

  it("una ubicación vacía no dibuja carga ni pallet", () => {
    const model = buildZoneModel([location(1, { ratio: 0 }), location(2, { ratio: 0.5, unidad: "kg" })], { triangleBudget: 1e6 });
    expect(model.cells[0].kind).toBeNull();
    expect(model.cells[0].height).toBe(0);
    expect(model.pallets.length).toBe(2);
    expect(model.kinds).toEqual(["saco"]);
    expect(model.cargo.saco.length % INSTANCE_STRIDE).toBe(0);
    expect(model.cells[1].height).toBeGreaterThan(0);
  });

  it("baja el detalle hasta caber en el presupuesto y lo respeta con 1.000 ubicaciones", () => {
    const locations = Array.from({ length: 1000 }, (_, index) => location(index, { ratio: 0.9, categoria: "quimico" }));
    const budget = QUALITY_PROFILES.low.cargoTriangleBudget;
    const full = buildZoneModel(locations, { triangleBudget: 1e9 });
    const limited = buildZoneModel(locations, { triangleBudget: budget });
    expect(full.detail).toEqual({ level: "unidades", simplePallet: false });
    expect(limited.detail.level).toBe("bloque");
    expect(limited.triangles).toBeLessThanOrEqual(budget);
    expect(limited.cargo.tambor.length / INSTANCE_STRIDE).toBe(1000);
  });

  it("si ni el detalle mínimo cabe, usa el mínimo", () => {
    const stacks = [{ kind: "tambor" as const, ratio: 1 }];
    const choice = chooseDetail(stacks, 1, 1);
    expect(choice).toEqual({ level: "bloque", simplePallet: true });
    expect(estimateTriangles(stacks, 1, choice)).toBeGreaterThan(1);
  });
});

describe("apoyo de las escenas", () => {
  it("la cámara encuadra zonas grandes desde más lejos y en pantallas verticales", () => {
    const small = fitCamera({ width: 8, depth: 6, height: 1.5 }, 16 / 9);
    const large = fitCamera({ width: 64, depth: 40, height: 1.5 }, 16 / 9);
    const portrait = fitCamera({ width: 64, depth: 40, height: 1.5 }, 9 / 16);
    const distance = (fit: typeof small) => Math.hypot(...fit.position);
    expect(distance(large)).toBeGreaterThan(distance(small));
    expect(distance(portrait)).toBeGreaterThan(distance(large));
    expect(large.far).toBeGreaterThan(distance(large) + 40);
  });

  it("detecta el perfil de gama baja y permite forzarlo", () => {
    expect(resolveQualityProfile({ cores: 8, memoryGb: 8, coarsePointer: false }).tier).toBe("high");
    expect(resolveQualityProfile({ cores: 4, memoryGb: 8 }).tier).toBe("low");
    expect(resolveQualityProfile({ cores: 8, memoryGb: 2 }).tier).toBe("low");
    expect(resolveQualityProfile({ cores: 8, coarsePointer: true }).tier).toBe("low");
    expect(resolveQualityProfile({ cores: 8, saveData: true }).tier).toBe("low");
    expect(resolveQualityProfile({ cores: 2, override: "high" }).tier).toBe("high");
    expect(QUALITY_PROFILES.low.maxDpr).toBeLessThanOrEqual(1.5);
  });

  it("no pinta códigos que quedarían ilegibles", () => {
    expect(labelFontSize("P0001", { width: 1.35, height: 0.3 }, 96)).toBeGreaterThan(12);
    expect(labelFontSize("P0001", { width: 1.35, height: 0.3 }, 20)).toBe(0);
  });

  it("el sitio muestra un bloque por zona con relleno según su ocupación", () => {
    const zones = [10, 50, 100, 250].map((ocupacion, index) => ({ id: `z${index}`, codigo: `Z${index}`, ocupacion, ubicaciones: 10 }));
    const model = buildSiteModel(zones, "ponton");
    expect(model.shell).toBe("flotante");
    expect(buildSiteModel(zones, "bodega").shell).toBe("terrestre");
    expect(new Set(model.blocks.map((block) => `${block.x}:${block.z}`)).size).toBe(zones.length);
    expect(model.blocks[0].fillHeight).toBeLessThan(model.blocks[1].fillHeight);
    expect(model.blocks[3].fillHeight).toBe(model.blocks[2].fillHeight);
    expect(model.blocks[2].fillHeight).toBe(model.height);
  });
});

describe("contenido por ubicación", () => {
  it("indexa saldos, ítems y lotes sin cambiar el resultado", () => {
    const item = (id: string, nombre: string, categoria: string) =>
      ({ id, id_organizacion: "org", codigo: id, nombre, categoria, unidad_medida: "kg", atributos: {}, activo: true, fecha_creacion: "" });
    const lot = (id: string, numero_lote: string, fecha_vencimiento: string | null) =>
      ({ id, id_organizacion: "org", id_item: "i1", numero_lote, fecha_vencimiento, atributos: {}, activo: true, fecha_creacion: "" });
    const content = locationContentIndex({
      items: [item("i1", "Alimento", "alimento"), item("i2", "Cloro", "quimico")],
      lots: [lot("l1", "L-1", "2027-01-01"), lot("l2", "L-2", "2026-12-01")],
      balances: [
        { id_ubicacion: "u1", id_item: "i1", id_lote: "l1", cantidad: 10, unidad_medida: "kg" },
        { id_ubicacion: "u1", id_item: "i2", id_lote: "l2", cantidad: 40, unidad_medida: "l" },
        { id_ubicacion: "u1", id_item: "i1", id_lote: "l1", cantidad: 0, unidad_medida: "kg" },
        { id_ubicacion: "u2", id_item: "i1", id_lote: null, cantidad: 0, unidad_medida: "kg" },
      ],
    });
    expect(content("u1")).toEqual({
      producto_nombre: "Alimento, Cloro",
      producto_categoria: "quimico",
      numero_lote: "L-1, L-2",
      fecha_vencimiento: "2026-12-01",
    });
    expect(content("u2")).toEqual({ producto_nombre: undefined, producto_categoria: undefined, numero_lote: undefined, fecha_vencimiento: null });
    expect(content("desconocida").producto_nombre).toBeUndefined();
  });
});
