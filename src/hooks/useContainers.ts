import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { ContainerAPI, ContainerQR, EstadoContainer } from '@/types';

interface ContainerFilters {
  estado?: EstadoContainer;
  skip?: number;
  limit?: number;
}

export function useContainers(idGalpon: string | undefined, filters?: ContainerFilters) {
  return useQuery<ContainerAPI[]>({
    queryKey: ['containers', idGalpon, filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ContainerAPI[]>('/containers/', {
        params: { id_galpon: idGalpon, ...filters },
      });
      return data;
    },
    enabled: !!idGalpon,
    staleTime: 30_000,
  });
}

export function useContainer(id: string | undefined) {
  return useQuery<ContainerAPI>({
    queryKey: ['containers', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ContainerAPI>(`/containers/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useContainerQR(id: string | undefined) {
  return useQuery<ContainerQR>({
    queryKey: ['containers', 'qr', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ContainerQR>(`/containers/${id}/qr`);
      return data;
    },
    enabled: !!id,
    staleTime: 60 * 60 * 1000,
  });
}

export function useUpdateContainerEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoContainer }) =>
      apiClient.patch(`/containers/${id}/estado`, { estado }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['containers', 'detail', vars.id] });
    },
  });
}
