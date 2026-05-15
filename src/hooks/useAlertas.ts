import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

export type AlertaTipo =
  | 'capacidad_critica'
  | 'vencimiento_7_dias'
  | 'vencimiento_30_dias'
  | 'stock_minimo'
  | 'movimiento_fuera_horario'
  | 'discrepancia_inventario'
  | 'sin_movimiento_30_dias'
  | 'cuarentena_activa';

export type AlertaSeveridad = 'critica' | 'aviso' | 'informativa';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  severidad: AlertaSeveridad;
  mensaje: string;
  created_at: string;
  resuelta: boolean;
}

export interface AlertasData {
  activas: Alerta[];
  historial: Alerta[];
  marcarRevisada: (id: string) => void;
  resolver: (id: string) => void;
  isLoading: boolean;
}

export function useAlertas(): AlertasData {
  const usuario = useAuthStore((s) => s.usuario);
  const idSede = usuario?.id_sede ?? '';
  const queryClient = useQueryClient();

  const activasQuery = useQuery<Alerta[]>({
    queryKey: ['alertas', 'activas', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<Alerta[]>('/alertas/activas', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 10_000,
  });

  const historialQuery = useQuery<Alerta[]>({
    queryKey: ['alertas', 'historial', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<Alerta[]>('/alertas/historial', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 30_000,
  });

  const revisarMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/alertas/${id}/revisar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas', 'activas'] });
      toast.success('Alerta marcada como revisada.');
    },
    onError: () => {
      toast.error('No se pudo marcar la alerta. Intenta de nuevo.');
    },
  });

  const resolverMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/alertas/${id}/resolver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas', 'activas'] });
      queryClient.invalidateQueries({ queryKey: ['alertas', 'historial'] });
      toast.success('Alerta resuelta.');
    },
    onError: () => {
      toast.error('No se pudo resolver la alerta. Intenta de nuevo.');
    },
  });

  return {
    activas: activasQuery.data ?? [],
    historial: historialQuery.data ?? [],
    marcarRevisada: (id: string) => revisarMutation.mutate(id),
    resolver: (id: string) => resolverMutation.mutate(id),
    isLoading: activasQuery.isLoading || historialQuery.isLoading,
  };
}
