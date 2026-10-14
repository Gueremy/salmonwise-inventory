import { describe, expect, it } from "vitest";
import { applyOrganizationPalette } from "@/domain/theme";
import { DEFAULT_THEME } from "@/domain/organization";

describe("paleta de organización", () => {
  it("aplica los colores de estado y descarta valores CSS inválidos", () => {
    applyOrganizationPalette({ ...DEFAULT_THEME, color_disponible: "#FF0000", color_critico: "invalid" });
    expect(document.documentElement.style.getPropertyValue("--status-disponible")).toBe("0 100% 50%");
    expect(document.documentElement.style.getPropertyValue("--status-critico")).toBe("0 84% 60%");
    applyOrganizationPalette();
  });
});
