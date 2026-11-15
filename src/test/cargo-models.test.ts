import { describe, expect, it } from "vitest";
import { Box3 } from "three";
import { mergedBoxEdges, modelGeometry, sharedCargoMaterial, triangleCount, unitBoxEdgesGeometry } from "@/components/three/cargoModels";
import { CARGO_KINDS, MODEL_TRIANGLES, PALLET } from "@/components/three/zoneLayout";

const names = [...CARGO_KINDS, "pallet", "palletSimple"] as const;

describe("modelos de carga", () => {
  it("cada modelo tiene los triángulos que usa el presupuesto", () => {
    for (const name of names) {
      expect(triangleCount(modelGeometry(name)), name).toBe(MODEL_TRIANGLES[name]);
    }
  });

  it("son de bajo polígono y traen normales y color por vértice, sin texturas", () => {
    for (const name of names) {
      const geometry = modelGeometry(name);
      expect(triangleCount(geometry), name).toBeLessThanOrEqual(72);
      expect(geometry.getAttribute("normal").count, name).toBe(geometry.getAttribute("position").count);
      expect(geometry.getAttribute("color").count, name).toBe(geometry.getAttribute("position").count);
      expect(geometry.getAttribute("uv"), name).toBeUndefined();
    }
    expect(sharedCargoMaterial().vertexColors).toBe(true);
    expect(sharedCargoMaterial().map).toBeNull();
  });

  it("las cargas caben en la caja unitaria apoyada en el piso", () => {
    for (const kind of CARGO_KINDS) {
      const box = new Box3().setFromBufferAttribute(modelGeometry(kind).getAttribute("position") as never);
      expect(box.min.y, kind).toBeCloseTo(0, 5);
      expect(box.max.y, kind).toBeLessThanOrEqual(1.02);
      expect(Math.max(box.max.x, -box.min.x, box.max.z, -box.min.z), kind).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    const pallet = new Box3().setFromBufferAttribute(modelGeometry("pallet").getAttribute("position") as never);
    expect(pallet.max.y).toBeCloseTo(PALLET.height, 5);
    expect(pallet.max.x - pallet.min.x).toBeCloseTo(PALLET.width, 5);
  });

  it("las caras miran hacia afuera", () => {
    for (const kind of CARGO_KINDS) {
      const geometry = modelGeometry(kind);
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      let outward = 0;
      for (let vertex = 0; vertex < position.count; vertex += 3) {
        const cx = (position.getX(vertex) + position.getX(vertex + 1) + position.getX(vertex + 2)) / 3;
        const cy = (position.getY(vertex) + position.getY(vertex + 1) + position.getY(vertex + 2)) / 3 - 0.5;
        const cz = (position.getZ(vertex) + position.getZ(vertex + 1) + position.getZ(vertex + 2)) / 3;
        if (cx * normal.getX(vertex) + cy * normal.getY(vertex) + cz * normal.getZ(vertex) >= -1e-6) outward += 1;
      }
      // Las asas del maxisaco son pequeñas pirámides propias; el resto mira hacia afuera del centro.
      expect(outward / (position.count / 3), kind).toBeGreaterThanOrEqual(kind === "granel" ? 0.6 : 1);
    }
  });

  it("las geometrías se crean una vez y se comparten", () => {
    expect(modelGeometry("caja")).toBe(modelGeometry("caja"));
    expect(sharedCargoMaterial()).toBe(sharedCargoMaterial());
  });

  it("junta los contornos de varias cajas en una sola geometría", () => {
    const merged = mergedBoxEdges([0, 0, 0, 2, 1, 2, 5, 0, 5, 2, 3, 2]);
    expect(merged.getAttribute("position").count).toBe(unitBoxEdgesGeometry().getAttribute("position").count * 2);
    merged.computeBoundingBox();
    expect(merged.boundingBox!.max.y).toBeCloseTo(3, 5);
    expect(merged.boundingBox!.min.x).toBeCloseTo(-1, 5);
    expect(merged.boundingBox!.max.x).toBeCloseTo(6, 5);
  });
});
