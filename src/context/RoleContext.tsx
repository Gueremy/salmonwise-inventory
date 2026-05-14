import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuthStore, type Usuario } from '@/store/authStore';

interface RoleContextType {
  usuario: Usuario;
  online: boolean;
  setOnline: (b: boolean) => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  // PrivateRoute garantiza que usuario no es null en rutas protegidas
  const usuario  = useAuthStore((s) => s.usuario) as Usuario;
  const [online, setOnline] = useState(true);
  return (
    <RoleContext.Provider value={{ usuario, online, setOnline }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole debe usarse dentro de RoleProvider');
  return ctx;
};
