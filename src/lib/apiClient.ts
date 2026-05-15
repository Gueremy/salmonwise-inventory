import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// En producción (Vercel) se usa /backend como proxy para evitar CORS.
// En desarrollo, Vite proxea /backend → axious-backend.onrender.com.
// VITE_API_URL puede sobreescribir ambos (ej: backend local).
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/backend',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || '/backend'}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(error.config);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);
