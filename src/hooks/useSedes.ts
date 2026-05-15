import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { SedeAPI } from '@/types';

const STALE = 15 * 60 * 1000;

export function useSedes() {
  return useQuery<SedeAPI[]>({
    queryKey: ['sedes'],
    queryFn: async () => {
      const { data } = await apiClient.get<SedeAPI[]>('/sedes/');
      return data;
    },
    staleTime: STALE,
  });
}

export function useSede(id: string | undefined) {
  return useQuery<SedeAPI>({
    queryKey: ['sedes', id],
    queryFn: async () => {
      const { data } = await apiClient.get<SedeAPI>(`/sedes/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: STALE,
  });
}

export function useCreateSede() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SedeAPI>) =>
      apiClient.post<SedeAPI>('/sedes/', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sedes'] }),
  });
}

export function useUpdateSede() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<SedeAPI> & { id: string }) =>
      apiClient.patch<SedeAPI>(`/sedes/${id}`, body).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sedes'] });
      qc.invalidateQueries({ queryKey: ['sedes', vars.id] });
    },
  });
}
