import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const ROLE_HOME: Record<string, string> = {
  operario: '/operario',
};

export const PrivateRoute = ({ roles }: { roles?: string[] }) => {
  const { isAuthenticated, usuario } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && usuario && !roles.includes(usuario.rol)) {
    const home = ROLE_HOME[usuario.rol] ?? '/';
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
};
