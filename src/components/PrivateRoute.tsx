import { Navigate, Outlet } from "react-router-dom";
import { type Rol, useRole } from "@/context/RoleContext";

const ROLE_HOME: Record<Rol, string> = {
  super_admin: "/dashboard",
  admin_sede: "/dashboard",
  jefe_bodega: "/dashboard",
  operario: "/operario",
  gerencia: "/gerencia",
};

export const PrivateRoute = ({ roles }: { roles?: Rol[] }) => {
  const { authenticated, authReady, usuario } = useRole();
  if (!authReady) return null;
  if (!authenticated) return <Navigate to="/" replace />;
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={ROLE_HOME[usuario.rol]} replace />;
  }
  return <Outlet />;
};
