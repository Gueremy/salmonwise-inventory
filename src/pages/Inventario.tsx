import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';
import type { TipoSede } from '@/types';

interface SedeApi {
  id: string;
  nombre: string;
  tipo: TipoSede;
}

interface KpiData {
  alertas_activas: number;
}

function SedeCard({ sede }: { sede: SedeApi }) {
  const kpisQuery = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', sede.id],
    queryFn: async () => {
      const { data } = await apiClient.get<KpiData>('/dashboard/kpis', {
        params: { id_sede: sede.id },
      });
      return data;
    },
    staleTime: 30_000,
  });

  const alertas = kpisQuery.data?.alertas_activas ?? 0;

  return (
    <Link
      to={`/sedes/${sede.id}`}
      className="bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition block"
    >
      <div className="flex items-center gap-2 mb-3">
        <Boxes className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{sede.nombre}</h3>
        {alertas > 0 && (
          <span className="ml-auto inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            {alertas} alerta{alertas !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground capitalize">{sede.tipo}</div>
    </Link>
  );
}

export default function Inventario() {
  const sedesQuery = useQuery<SedeApi[]>({
    queryKey: ['sedes'],
    queryFn: async () => {
      const { data } = await apiClient.get<SedeApi[]>('/sedes/', {
        params: { skip: 0, limit: 20 },
      });
      return data;
    },
    staleTime: 15 * 60 * 1000,
  });

  if (sedesQuery.isLoading) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        <p className="text-sm text-muted-foreground">Selecciona una sede para entrar a su vista 3D.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sedesQuery.isError) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar las sedes. Revisa tu conexion.
        </div>
      </div>
    );
  }

  const sedes = sedesQuery.data ?? [];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <p className="text-sm text-muted-foreground">Selecciona una sede para entrar a su vista 3D.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sedes.map((s) => (
          <SedeCard key={s.id} sede={s} />
        ))}
      </div>
    </div>
  );
}
