import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const PrivateRoute = ({ roles }: { roles?: string[] }) => {
  const { isAuthenticated, usuario } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && usuario && !roles.includes(usuario.rol))
    return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
