import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Box, Bell, ArrowUpRight, Clock, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDashboard } from '@/hooks/useDashboard';
import { useAlertas } from '@/hooks/useAlertas';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/apiClient';
import { estadoColorHex, ocupacionToEstado } from '@/types';
import { tiempoRelativo } from '@/lib/utils';
import type { Movimiento } from '@/types';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent: string;
}

const KpiCard = ({ label, value, sub, icon: Icon, accent }: KpiCardProps) => (
  <div className="kpi-card">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className="text-3xl font-bold mt-1.5">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
      <div className={`h-10 w-10 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const KpiSkeleton = () => (
  <div className="kpi-card space-y-2">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

const sevColor: Record<string, string> = {
  critica: 'bg-destructive',
  aviso: 'bg-[hsl(var(--status-medio))]',
  informativa: 'bg-primary',
};

export default function Dashboard() {
  useWebSocket();

  const usuario = useAuthStore((s) => s.usuario);
  const idSede = usuario?.id_sede ?? '';

  const { kpis, ocupacion, evolucion, isLoading, isError } = useDashboard();
  const { activas } = useAlertas();

  const movimientosPendientesQuery = useQuery<Movimiento[]>({
    queryKey: ['movimientos', 'pendientes', idSede],
    queryFn: async () => {
      const { data } = await apiClient.get<Movimiento[]>('/movimientos/pendientes', {
        params: { id_sede: idSede },
      });
      return data;
    },
    enabled: !!idSede,
    staleTime: 15_000,
  });

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const aprobar = async (id: string) => {
    try {
      await apiClient.patch(`/movimientos/${id}/aprobar`);
      movimientosPendientesQuery.refetch();
      toast.success('Movimiento aprobado.');
    } catch {
      toast.error('No se pudo aprobar el movimiento.');
    }
  };

  const rechazar = async () => {
    if (!rejecting || !motivo.trim()) return;
    try {
      await apiClient.patch(`/movimientos/${rejecting}/rechazar`, { motivo });
      movimientosPendientesQuery.refetch();
      toast.success('Movimiento rechazado.');
    } catch {
      toast.error('No se pudo rechazar el movimiento.');
    } finally {
      setRejecting(null);
      setMotivo('');
    }
  };

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los datos. Revisa tu conexión.
        </div>
      </div>
    );
  }

  const pendientes = movimientosPendientesQuery.data ?? [];
  const alertasRecientes = activas.slice(0, 4);
  const chartData = ocupacion.map((g) => ({
    name: g.name,
    ocup: g.ocup ?? g.ocupacion_pct,
    estado: g.estado ?? ocupacionToEstado(g.ocup ?? g.ocupacion_pct),
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Ocupacion Global"
              value={`${kpis?.ocupacion_global ?? 0}%`}
              icon={Box}
              accent="bg-primary/10 text-primary"
            />
            <KpiCard
              label="Alertas Activas"
              value={String(kpis?.alertas_activas ?? 0)}
              icon={Bell}
              accent="bg-destructive/10 text-destructive"
            />
            <KpiCard
              label="Movimientos Hoy"
              value={String(kpis?.movimientos_hoy ?? 0)}
              icon={ArrowUpRight}
              accent="bg-status-disponible/10 text-status-disponible"
            />
            <KpiCard
              label="Prox. Vencimiento"
              value={kpis?.proximo_vencimiento != null ? `${kpis.proximo_vencimiento} dias` : 'Sin datos'}
              icon={Clock}
              accent="bg-status-medio/10 text-status-medio"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart — ocupacion por galpon */}
        <div className="xl:col-span-2 bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Ocupacion por galpon</h3>
              <p className="text-xs text-muted-foreground">{usuario?.sede_nombre ?? 'Sede actual'}</p>
            </div>
          </div>
          <div className="h-72">
            {isLoading ? (
              <div className="space-y-2 pt-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="ocup" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={estadoColorHex[ocupacionToEstado(d.ocup)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Alertas recientes */}
        <div className="bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Alertas recientes</h3>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : alertasRecientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
            ) : (
              alertasRecientes.map((a) => (
                <div key={a.id} className="flex gap-3 p-3 rounded-md bg-muted/40">
                  <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${sevColor[a.severidad] ?? 'bg-secondary'}`} />
                  <div className="min-w-0">
                    <div className="text-sm">{a.mensaje}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tiempoRelativo(a.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Line chart — evolucion */}
      {evolucion.length > 0 && (
        <div className="bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Evolucion de movimientos (30 dias)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={evolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="movimientos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Total" />
                <Line type="monotone" dataKey="entradas" stroke="hsl(var(--status-disponible))" strokeWidth={1.5} dot={false} name="Entradas" />
                <Line type="monotone" dataKey="salidas" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} name="Salidas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla movimientos pendientes */}
      <div className="bg-card rounded-lg border border-border/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Movimientos pendientes de aprobacion</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">Producto</th>
                <th className="text-left px-5 py-3 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 font-medium">Operario</th>
                <th className="text-left px-5 py-3 font-medium">Galpon</th>
                <th className="text-left px-5 py-3 font-medium">Hora</th>
                <th className="text-right px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientosPendientesQuery.isLoading && (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={7} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              )}
              {!movimientosPendientesQuery.isLoading && pendientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Sin movimientos pendientes
                  </td>
                </tr>
              )}
              {pendientes.map((m, i) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{m.producto}</td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{m.tipo.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3">{m.operario}</td>
                  <td className="px-5 py-3">{m.galpon}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.hora}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-status-disponible/40 text-status-disponible hover:bg-status-disponible/10"
                      onClick={() => aprobar(m.id)}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setRejecting(m.id)}
                    >
                      Rechazar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo del rechazo</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Indica el motivo (obligatorio)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={!motivo.trim()} onClick={rechazar}>
              Confirmar rechazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
