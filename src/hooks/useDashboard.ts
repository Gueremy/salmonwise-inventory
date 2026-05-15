import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

interface KpiData {
  ocupacion_global: number;
  alertas_activas: number;
  movimientos_hoy: number;
  proximo_vencimiento: number | null;
}

interface OcupacionGalpon {
  name: string;
  ocupacion_pct: number;
  ocup: number;
  estado: string;
}

interface EvolucionData {
  fecha: string;
  movimientos: number;
  entradas: number;
  salidas: number;
}

export interface DashboardData {
  kpis: KpiData | undefined;
  ocupacion: OcupacionGalpon[];
  evolucion: EvolucionData[];
  isLoading: boolean;
  isError: boolean;
}

export function useDashboard(): DashboardData {
  const usuario = useAuthStore((s) => s.usuario);
  const idSede = usuario?.id_sede ?? '';

  const kpisQuery = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<KpiData>('/dashboard/kpis', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 30_000,
  });

  const ocupacionQuery = useQuery<OcupacionGalpon[]>({
    queryKey: ['dashboard', 'ocupacion', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<OcupacionGalpon[]>(
        '/dashboard/ocupacion-por-galpon',
        { params: { id_sede: idSede } }
      );
      return data;
    },
    enabled: !!idSede,
    staleTime: 30_000,
  });

  const evolucionQuery = useQuery<EvolucionData[]>({
    queryKey: ['dashboard', 'evolucion', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<EvolucionData[]>('/dashboard/evolucion', {
        params: { id_sede: idSede, dias: 30 },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 30_000,
  });

  return {
    kpis: kpisQuery.data,
    ocupacion: ocupacionQuery.data ?? [],
    evolucion: evolucionQuery.data ?? [],
    isLoading: kpisQuery.isLoading || ocupacionQuery.isLoading || evolucionQuery.isLoading,
    isError: kpisQuery.isError || ocupacionQuery.isError || evolucionQuery.isError,
  };
}
