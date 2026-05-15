import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { MovimientoAPI } from '@/types';

export function useMovimientosPendientes(idSede: string | undefined) {
  return useQuery<MovimientoAPI[]>({
    queryKey: ['movimientos', 'pendientes', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<MovimientoAPI[]>('/movimientos/pendientes', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useFefo(idProducto: string | undefined, idSede: string | undefined) {
  return useQuery<MovimientoAPI[]>({
    queryKey: ['movimientos', 'fefo', idProducto, idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<MovimientoAPI[]>('/movimientos/fefo', {
        params: { id_producto: idProducto, id_sede: idSede },
      });
      return data;
    },
    enabled: !!idProducto && !!idSede,
    staleTime: 60_000,
  });
}

export function useTrazabilidad(numeroLote: string) {
  return useQuery<MovimientoAPI[]>({
    queryKey: ['movimientos', 'trazabilidad', numeroLote],
    queryFn: async () => {
      const { data } = await apiClient.get<MovimientoAPI[]>('/movimientos/trazabilidad', {
        params: { numero_lote: numeroLote },
      });
      return data;
    },
    enabled: numeroLote.length > 3,
    staleTime: 30_000,
  });
}

interface CreateMovimientoPayload {
  tipo: string;
  id_container: string;
  cantidad: number;
  unidad: string;
  observaciones?: string;
  numero_lote?: string;
  fecha_vencimiento?: string;
  nombre_proveedor?: string;
  num_guia_despacho?: string;
  registro_sanitario?: string;
  temperatura_almacen?: number;
}

export function useCreateMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMovimientoPayload) =>
      apiClient.post<MovimientoAPI>('/movimientos/', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] });
      qc.invalidateQueries({ queryKey: ['containers'] });
    },
  });
}

export function useAprobarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/movimientos/${id}/aprobar`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movimientos'] }),
  });
}

export function useRechazarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      apiClient.patch(`/movimientos/${id}/rechazar`, { motivo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['movimientos'] }),
  });
}
