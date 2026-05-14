import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin_sede' | 'jefe_bodega' | 'operario' | 'gerencia';
  codigo_empleado: string;
  id_sede: string | null;
  sede_nombre: string | null;
}

interface AuthStore {
  usuario: Usuario | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (token: string, refreshToken: string) => void;
  setUsuario: (usuario: Usuario) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),
      setUsuario: (usuario) => set({ usuario }),
      logout: () =>
        set({ usuario: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'axious-auth' }
  )
);

export type { Usuario };
