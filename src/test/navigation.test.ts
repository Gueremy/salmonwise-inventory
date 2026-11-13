import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS } from "@/context/RoleContext";
import { canOpenRoute, homePathFor, isOperarioLayoutPath, safeInternalPath, visibleNavItems, type NavRule } from "@/lib/navigation";

const menu: NavRule[] = [
  { to: "/operario", roles: ["operario"] },
  { to: "/sites" },
  { to: "/movements" },
  { to: "/reconciliation", module: "importacion" },
  { to: "/layout", permission: "sitio:write" },
  { to: "/alerts" },
  { to: "/reports" },
  { to: "/dashboard", permission: "dashboard:read" },
  { to: "/users", permission: "rbac:manage" },
];

function menuFor(rol: string, modules: string[] = ["importacion"]) {
  const permissions = new Set(DEFAULT_ROLE_PERMISSIONS[rol] ?? []);
  return visibleNavItems(menu, {
    rol,
    can: (permission) => rol === "super_admin" || permissions.has(permission),
    hasModule: (moduleId) => modules.includes(moduleId),
  }).map((item) => item.to);
}

describe("pantalla inicial por rol", () => {
  it("nadie entra por defecto al dashboard", () => {
    for (const rol of ["operario", "jefe_bodega", "admin_sede", "super_admin", "gerencia", "rol_personalizado", "", null, undefined]) {
      expect(homePathFor(rol)).not.toBe("/dashboard");
    }
  });

  it("el operario entra a Operaciones y los roles de bodega a Lugares", () => {
    expect(homePathFor("operario")).toBe("/operario");
    expect(homePathFor("jefe_bodega")).toBe("/sites");
    expect(homePathFor("admin_sede")).toBe("/sites");
    expect(homePathFor("super_admin")).toBe("/sites");
    expect(homePathFor("rol_personalizado")).toBe("/sites");
  });

  it("gerencia conserva su resumen gerencial", () => {
    expect(homePathFor("gerencia")).toBe("/gerencia");
  });

  it("solo acepta destinos internos al volver del login", () => {
    expect(safeInternalPath("/zones/1?focus=2")).toBe("/zones/1?focus=2");
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});

describe("menú lateral", () => {
  it("ya no ofrece Configuración a ningún rol", () => {
    for (const rol of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
      expect(menuFor(rol)).not.toContain("/settings");
    }
  });

  it("muestra Dashboard solo con dashboard:read", () => {
    expect(menuFor("jefe_bodega")).toContain("/dashboard");
    expect(menuFor("rol_sin_permisos")).not.toContain("/dashboard");
  });

  it("al operario solo le deja entradas que no lo devuelven a /operario", () => {
    const visible = menuFor("operario");
    expect(visible).toEqual(["/operario", "/sites", "/movements"]);
    expect(visible.filter((to) => to !== "/operario").every(isOperarioLayoutPath)).toBe(true);
  });

  it("respeta permisos y módulos para el resto", () => {
    expect(menuFor("jefe_bodega")).not.toContain("/layout");
    expect(menuFor("admin_sede")).toContain("/layout");
    expect(menuFor("admin_sede", [])).not.toContain("/reconciliation");
    expect(menuFor("super_admin")).toContain("/users");
    expect(menuFor("admin_sede")).not.toContain("/operario");
  });
});

describe("acceso directo por URL", () => {
  const context = (rol: string, permissions: string[], modules: string[] = []) => ({
    rol,
    can: (permission: string) => permissions.includes(permission),
    hasModule: (moduleId: string) => modules.includes(moduleId),
  });

  it("impide abrir pantallas administrativas sin permiso aunque se escriba la URL", () => {
    const worker = context("operario", DEFAULT_ROLE_PERMISSIONS.operario);
    expect(canOpenRoute("/users", worker)).toBe(false);
    expect(canOpenRoute("/layout", worker)).toBe(false);
    expect(canOpenRoute("/dashboard", worker)).toBe(false);
    expect(canOpenRoute("/sites/123", worker)).toBe(true);
  });

  it("exige permiso y módulo para conciliación", () => {
    const admin = context("admin_sede", DEFAULT_ROLE_PERMISSIONS.admin_sede);
    expect(canOpenRoute("/reconciliation/import", admin)).toBe(false);
    expect(canOpenRoute("/reconciliation/import", context("admin_sede", DEFAULT_ROLE_PERMISSIONS.admin_sede, ["importacion"]))).toBe(true);
  });
});
