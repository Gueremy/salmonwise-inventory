import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { GalponAPI } from '@/types';

const STALE = 15 * 60 * 1000;

export function useGalpones(idSede: string | undefined) {
  return useQuery<GalponAPI[]>({
    queryKey: ['galpones', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<GalponAPI[]>('/galpones/', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: STALE,
  });
}

export function useGalon(id: string | undefined) {
  return useQuery<GalponAPI>({
    queryKey: ['galpones', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<GalponAPI>(`/galpones/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateGalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<GalponAPI>) =>
      apiClient.post<GalponAPI>('/galpones/', body).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['galpones', data.id_sede] });
    },
  });
}

export function useUpdateGalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<GalponAPI> & { id: string }) =>
      apiClient.patch<GalponAPI>(`/galpones/${id}`, body).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['galpones', data.id_sede] });
      qc.invalidateQueries({ queryKey: ['galpones', 'detail', data.id] });
    },
  });
}
