import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

type TipoReporte = 'movimientos/pdf' | 'movimientos/excel' | 'sernapesca';

interface ReporteParams {
  id_sede?: string;
  desde?: string;
  hasta?: string;
}

function nombreArchivo(tipo: TipoReporte): string {
  const ts = new Date().toISOString().slice(0, 10);
  if (tipo === 'movimientos/pdf')   return `reporte-movimientos-${ts}.pdf`;
  if (tipo === 'movimientos/excel') return `reporte-movimientos-${ts}.xlsx`;
  return `reporte-sernapesca-${ts}.xlsx`;
}

export function useDescargarReporte() {
  return useMutation({
    mutationFn: async ({ tipo, params }: { tipo: TipoReporte; params?: ReporteParams }) => {
      const { data } = await apiClient.get<Blob>(`/reportes/${tipo}`, {
        params,
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href     = url;
      link.download = nombreArchivo(tipo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onMutate: () => toast.loading('Generando reporte...'),
    onSuccess: (_, _v, context) => {
      if (typeof context === 'string') toast.dismiss(context);
      toast.success('Reporte descargado correctamente.');
    },
    onError: (_, _v, context) => {
      if (typeof context === 'string') toast.dismiss(context);
      toast.error('No se pudo generar el reporte. Intenta de nuevo.');
    },
  });
}
