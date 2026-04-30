import { createContext, useContext, useState, ReactNode } from "react";
import { usuarios, Usuario } from "@/data/mock";

interface RoleContextType {
  usuario: Usuario;
  setUsuario: (u: Usuario) => void;
  online: boolean;
  setOnline: (b: boolean) => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario>(usuarios[0]);
  const [online, setOnline] = useState(true);
  return (
    <RoleContext.Provider value={{ usuario, setUsuario, online, setOnline }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole debe usarse dentro de RoleProvider");
  return ctx;
};
