import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Rol = "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  codigo_empleado: string;
  rol: Rol;
  sede: string;
  id_sede: string | null;
  turno: "A" | "B" | null;
  activo: boolean;
}

export const rolLabel: Record<Rol, string> = {
  jefe_bodega: "Jefe de Bodega",
  admin_sede: "Admin Sede",
  operario: "Operario",
  gerencia: "Gerencia",
  super_admin: "Super Admin",
};

const DEFAULT_USER: Usuario = {
  id: "",
  nombre: "Usuario",
  email: "",
  codigo_empleado: "",
  rol: "operario",
  sede: "Sin sede asignada",
  id_sede: null,
  turno: null,
  activo: false,
};

interface RoleContextType {
  usuario: Usuario;
  setUsuario: (u: Usuario) => void;
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refreshToken: string | null;
  setRefreshToken: (token: string | null) => void;
  online: boolean;
  setOnline: (b: boolean) => void;
  logout: () => void;
  authReady: boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

const STORAGE_USER_KEY = "axious.user";
const STORAGE_TOKEN_KEY = "axious.accessToken";
const STORAGE_REFRESH_KEY = "axious.refreshToken";

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario>(DEFAULT_USER);
  const [authenticated, setAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(STORAGE_REFRESH_KEY);

    if (storedUser && storedToken && storedRefreshToken) {
      try {
        setUsuario(JSON.parse(storedUser) as Usuario);
        setAccessToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setAuthenticated(true);
      } catch {
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_REFRESH_KEY);
      }
    }

    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (authenticated && accessToken && refreshToken) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(usuario));
      localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
      localStorage.setItem(STORAGE_REFRESH_KEY, refreshToken);
      return;
    }

    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
  }, [authenticated, accessToken, refreshToken, usuario]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleTokens = (event: Event) => {
      const tokens = (event as CustomEvent<{ access_token: string; refresh_token: string }>).detail;
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
    };
    const handleExpired = () => {
      setAuthenticated(false);
      setAccessToken(null);
      setRefreshToken(null);
      setUsuario(DEFAULT_USER);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("axious:tokens", handleTokens);
    window.addEventListener("axious:session-expired", handleExpired);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("axious:tokens", handleTokens);
      window.removeEventListener("axious:session-expired", handleExpired);
    };
  }, []);

  const logout = () => {
    setAuthenticated(false);
    setAccessToken(null);
    setRefreshToken(null);
    setUsuario(DEFAULT_USER);
  };

  return (
    <RoleContext.Provider
      value={{
        usuario,
        setUsuario,
        authenticated,
        setAuthenticated,
        accessToken,
        setAccessToken,
        refreshToken,
        setRefreshToken,
        online,
        setOnline,
        logout,
        authReady,
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
