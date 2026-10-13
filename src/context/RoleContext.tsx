import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { Organization, DEFAULT_THRESHOLDS, DEFAULT_THEME } from "../domain/organization";

export type Rol = "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  sede: string;
  id_organizacion?: string;
  organizacion_nombre?: string;
  permisos?: string[];
  modulos_activos?: string[];
}

export const rolLabel: Record<Rol, string> = {
  jefe_bodega: "Jefe de Bodega",
  admin_sede: "Admin Sede",
  operario: "Operario",
  gerencia: "Gerencia",
  super_admin: "Super Admin",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<Rol, string[]> = {
  super_admin: [
    "sitio:read", "sitio:write", "sitio:delete",
    "zona:read", "zona:write", "zona:delete",
    "ubicacion:read", "ubicacion:write", "ubicacion:delete",
    "item:read", "item:write", "item:delete",
    "lote:read", "lote:write",
    "stock:read", "stock:adjust",
    "movimiento:create", "movimiento:approve", "movimiento:reject",
    "dashboard:read", "reporte:export", "rbac:manage", "reconciliation:manage",
  ],
  admin_sede: [
    "sitio:read", "sitio:write",
    "zona:read", "zona:write",
    "ubicacion:read", "ubicacion:write",
    "item:read", "item:write",
    "lote:read", "lote:write",
    "stock:read",
    "movimiento:create", "movimiento:approve", "movimiento:reject",
    "dashboard:read", "reporte:export", "reconciliation:manage",
  ],
  jefe_bodega: [
    "sitio:read", "zona:read", "ubicacion:read",
    "item:read", "lote:read", "stock:read",
    "movimiento:create", "movimiento:approve", "movimiento:reject",
    "dashboard:read", "reporte:export", "reconciliation:manage",
  ],
  operario: [
    "sitio:read", "zona:read", "ubicacion:read",
    "item:read", "lote:read", "stock:read",
    "movimiento:create",
  ],
  gerencia: [
    "sitio:read", "zona:read", "ubicacion:read",
    "item:read", "lote:read", "stock:read",
    "dashboard:read", "reporte:export",
  ],
};

const DEFAULT_ORGANIZATION: Organization = {
  id: "org-default",
  codigo: "AXIOUS",
  nombre: "Axious Los Lagos",
  configuracion: {
    umbrales: DEFAULT_THRESHOLDS,
    colores: DEFAULT_THEME,
    unidades_permitidas: ["kg", "ton", "unidades", "litros"],
    estrategia_picking_default: "FEFO",
  },
  atributos: {},
  activo: true,
  fecha_creacion: new Date().toISOString(),
};

const DEFAULT_USER: Usuario = {
  id: "",
  nombre: "Usuario",
  rol: "operario",
  sede: "Sin sede asignada",
  id_organizacion: DEFAULT_ORGANIZATION.id,
  organizacion_nombre: DEFAULT_ORGANIZATION.nombre,
  permisos: DEFAULT_ROLE_PERMISSIONS.operario,
  modulos_activos: ["offline_sync", "importacion", "fefo"],
};

interface RoleContextType {
  usuario: Usuario;
  setUsuario: (u: Usuario) => void;
  organizacion: Organization;
  setOrganizacion: (org: Organization) => void;
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  online: boolean;
  setOnline: (b: boolean) => void;
  logout: () => void;
  authReady: boolean;
  can: (permission: string) => boolean;
  hasModule: (moduleId: string) => boolean;
  setModulosActivos: (modules: string[]) => void;
  modulosActivos: string[];
}

const RoleContext = createContext<RoleContextType | null>(null);

const STORAGE_USER_KEY = "axious.user";
const STORAGE_TOKEN_KEY = "axious.accessToken";
const STORAGE_ORG_KEY = "axious.org";

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario>(DEFAULT_USER);
  const [organizacion, setOrganizacion] = useState<Organization>(DEFAULT_ORGANIZATION);
  const [authenticated, setAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [modulosActivos, setModulosActivos] = useState<string[]>(["offline_sync", "importacion", "fefo"]);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedOrg = localStorage.getItem(STORAGE_ORG_KEY);

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser) as Usuario;
      setUsuario(parsedUser);
      setAccessToken(storedToken);
      setAuthenticated(true);
      if (parsedUser.modulos_activos) {
        setModulosActivos(parsedUser.modulos_activos);
      }
    }

    if (storedOrg) {
      try {
        setOrganizacion(JSON.parse(storedOrg) as Organization);
      } catch {
        // Ignorar si el formato es inválido
      }
    }

    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (authenticated && accessToken) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(usuario));
      localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
      localStorage.setItem(STORAGE_ORG_KEY, JSON.stringify(organizacion));
      return;
    }

    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_ORG_KEY);
  }, [authenticated, accessToken, usuario, organizacion]);

  const logout = () => {
    setAuthenticated(false);
    setAccessToken(null);
    setUsuario(DEFAULT_USER);
    setOrganizacion(DEFAULT_ORGANIZATION);
    setModulosActivos(["offline_sync", "importacion", "fefo"]);
  };

  const userPermissions = useMemo(() => {
    if (usuario.permisos && usuario.permisos.length > 0) {
      return new Set(usuario.permisos);
    }
    return new Set(DEFAULT_ROLE_PERMISSIONS[usuario.rol] ?? []);
  }, [usuario.permisos, usuario.rol]);

  const can = (permission: string): boolean => {
    if (usuario.rol === "super_admin") return true;
    return userPermissions.has(permission);
  };

  const hasModule = (moduleId: string): boolean => {
    return modulosActivos.includes(moduleId);
  };

  return (
    <RoleContext.Provider
      value={{
        usuario,
        setUsuario,
        organizacion,
        setOrganizacion,
        authenticated,
        setAuthenticated,
        accessToken,
        setAccessToken,
        online,
        setOnline,
        logout,
        authReady,
        can,
        hasModule,
        setModulosActivos,
        modulosActivos,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole debe usarse dentro de RoleProvider");
  return ctx;
};
