/**
 * Reglas de navegación por rol: pantalla inicial y entradas de menú visibles.
 * Son funciones puras para poder probarlas sin montar la aplicación.
 */

export const OPERARIO_HOME = "/operario";
export const PLACES_HOME = "/sites";
export const MANAGEMENT_HOME = "/gerencia";

/** Rutas del layout de escritorio que el operario puede abrir desde su vista móvil. */
const OPERARIO_LAYOUT_PATHS = /^\/(sites|zones|locations|movements|inventario)(\/|$)/;

/**
 * Pantalla a la que entra cada rol después de iniciar sesión.
 * Nadie entra por defecto al Dashboard: el trabajo diario parte en Operaciones o Lugares.
 */
export function homePathFor(rol: string | null | undefined): string {
  if (rol === "operario") return OPERARIO_HOME;
  if (rol === "gerencia") return MANAGEMENT_HOME;
  return PLACES_HOME;
}

export function isOperarioLayoutPath(pathname: string): boolean {
  return OPERARIO_LAYOUT_PATHS.test(pathname);
}

/** Destino pedido antes del login; solo se aceptan rutas internas. */
export function safeInternalPath(requested: string | null | undefined): string | null {
  if (!requested) return null;
  return requested.startsWith("/") && !requested.startsWith("//") && !/[\\\u0000-\u001f]/.test(requested)
    ? requested : null;
}

export interface NavRule {
  to: string;
  permission?: string;
  module?: string;
  roles?: string[];
}

export interface NavContext {
  rol: string;
  can: (permission: string) => boolean;
  hasModule: (moduleId: string) => boolean;
}

/** Las mismas capacidades del menú se aplican a las rutas abiertas por URL. */
export function canOpenRoute(pathname: string, ctx: NavContext): boolean {
  if (pathname === OPERARIO_HOME) return ctx.can("movimiento:create");
  if (/^\/(dashboard|gerencia)(\/|$)/.test(pathname)) return ctx.can("dashboard:read");
  if (/^\/(users|usuarios)(\/|$)/.test(pathname)) return ctx.can("rbac:manage");
  if (/^\/layout(\/|$)/.test(pathname)) return ctx.can("sitio:write");
  if (/^\/reconciliation(\/|$)/.test(pathname)) return ctx.can("reconciliation:manage") && ctx.hasModule("importacion");
  if (/^\/(reports|reportes)(\/|$)/.test(pathname)) return ctx.can("reporte:export");
  if (/^\/(movements|movimientos)(\/|$)/.test(pathname)) return ctx.can("movimiento:create") || ctx.can("movimiento:approve");
  if (/^\/(locations)(\/|$)/.test(pathname)) return ctx.can("ubicacion:read");
  if (/^\/(zones|galpon)(\/|$)/.test(pathname)) return ctx.can("zona:read");
  if (/^\/(sites|sedes|inventario)(\/|$)/.test(pathname)) return ctx.can("sitio:read");
  return true;
}

/**
 * Filtra el menú lateral. Además de permisos y módulos, al operario se le ocultan
 * las entradas que el layout le devolvería a /operario.
 */
export function visibleNavItems<T extends NavRule>(items: readonly T[], ctx: NavContext): T[] {
  return items.filter((item) => {
    if (item.roles && !item.roles.includes(ctx.rol)) return false;
    if (item.permission && !ctx.can(item.permission)) return false;
    if (item.module && !ctx.hasModule(item.module)) return false;
    if (ctx.rol === "operario" && item.to !== OPERARIO_HOME && !isOperarioLayoutPath(item.to)) return false;
    return true;
  });
}
