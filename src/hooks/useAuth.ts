import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/apiClient';
import type { Rol } from '@/types';

const ROUTE_BY_ROL: Record<Rol, string> = {
  operario:    '/operario',
  gerencia:    '/gerencia',
  super_admin: '/dashboard',
  admin_sede:  '/dashboard',
  jefe_bodega: '/dashboard',
};

export function useAuth() {
  const navigate = useNavigate();
  const store    = useAuthStore();

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // logout local aunque falle el servidor
    }
    store.logout();
    navigate('/');
  };

  const navigateByRol = () => {
    if (store.usuario) {
      navigate(ROUTE_BY_ROL[store.usuario.rol] ?? '/dashboard');
    }
  };

  return { ...store, logout, navigateByRol };
}
