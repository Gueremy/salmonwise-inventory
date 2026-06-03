import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Rol = "jefe_bodega" | "admin_sede" | "operario" | "gerencia" | "super_admin";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  sede: string;
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
  rol: "operario",
  sede: "Sin sede asignada",
};

interface RoleContextType {
  usuario: Usuario;
  setUsuario: (u: Usuario) => void;
  authenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  online: boolean;
  setOnline: (b: boolean) => void;
  logout: () => void;
  authReady: boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

const STORAGE_USER_KEY = "axious.user";
const STORAGE_TOKEN_KEY = "axious.accessToken";

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario>(DEFAULT_USER);
  const [authenticated, setAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

    if (storedUser && storedToken) {
      setUsuario(JSON.parse(storedUser) as Usuario);
      setAccessToken(storedToken);
      setAuthenticated(true);
    }

    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (authenticated && accessToken) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(usuario));
      localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
      return;
    }

    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }, [authenticated, accessToken, usuario]);

  const logout = () => {
    setAuthenticated(false);
    setAccessToken(null);
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
