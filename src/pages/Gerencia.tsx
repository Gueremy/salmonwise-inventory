import {
  Bar, BarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Legend,
  Cell,
} from "recharts";
import { Bell, FileText, FileSpreadsheet, Ship, Factory, Warehouse, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSedes } from "@/hooks/useSedes";
import { useDescargarReporte } from "@/hooks/useReportes";
import { ocupacionToEstado, estadoColorHex } from "@/types";
import type { SedeAPI, TipoSede } from "@/types";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

const tipoIcon: Record<TipoSede, React.ComponentType<{ className?: string }>> = {
  embarcacion: Ship,
  planta:      Factory,
  bodega:      Warehouse,
  ponton:      Anchor,
};

interface KpiData {
  ocupacion_global: number;
  alertas_activas: number;
}

const radarData = [
  { metric: "Ocupación",         PM: 45, BC: 88, PLA: 72, PBS: 31 },
  { metric: "Alertas",           PM: 0,  BC: 60, PLA: 20, PBS: 0 },
  { metric: "Movimientos",       PM: 70, BC: 50, PLA: 35, PBS: 20 },
  { metric: "Cumpl. SERNAPESCA", PM: 95, BC: 80, PLA: 92, PBS: 98 },
];

function SedeGerenciaCard({ sede }: { sede: SedeAPI }) {
  const kpiQuery = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', sede.id],
    queryFn: async () => {
      const { data } = await apiClient.get<KpiData>('/dashboard/kpis', {
        params: { id_sede: sede.id },
      });
      return data;
    },
    staleTime: 30_000,
  });

  const Icon = tipoIcon[sede.tipo] ?? Warehouse;
  const pct = kpiQuery.data?.ocupacion_global ?? 0;
  const est = ocupacionToEstado(pct);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <Icon className="h-5 w-5 text-primary" />
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: estadoColorHex[est] }}
        />
      </div>
      <div className="font-semibold text-sm leading-tight">{sede.nombre}</div>
      <div className="text-3xl font-bold mt-3">
        {kpiQuery.isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : `${pct}%`}
      </div>
      <div className="text-xs text-muted-foreground">Ocupación</div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bell className="h-3 w-3" />
        {sede.estado === 'activo' ? 'Activa' : 'Inactiva'}
      </div>
    </div>
  );
}

export default function Gerencia() {
  const { data: sedes, isLoading } = useSedes();
  const descargar = useDescargarReporte();

  const kpiQueries = useQueries({
    queries: (sedes ?? []).map((s) => ({
      queryKey: ['dashboard', 'kpis', s.id],
      queryFn: async () => {
        const { data } = await apiClient.get<KpiData>('/dashboard/kpis', {
          params: { id_sede: s.id },
        });
        return data;
      },
      staleTime: 30_000,
    })),
  });

  const chartData = (sedes ?? []).map((s, i) => ({
    nombre: s.nombre.slice(0, 12),
    ocup: kpiQueries[i]?.data?.ocupacion_global ?? 0,
    estado: ocupacionToEstado(kpiQueries[i]?.data?.ocupacion_global ?? 0),
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Gerencia</h1>
          <p className="text-sm text-muted-foreground">Visión global multi-sede · solo lectura</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => descargar.mutate({ tipo: 'movimientos/pdf' })}
            disabled={descargar.isPending}
          >
            <FileText className="h-4 w-4 mr-1.5" />PDF ejecutivo
          </Button>
          <Button
            variant="outline"
            onClick={() => descargar.mutate({ tipo: 'movimientos/excel' })}
            disabled={descargar.isPending}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-5 space-y-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : sedes?.map((s) => <SedeGerenciaCard key={s.id} sede={s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-1">Comparativo multi-sede</h3>
          <p className="text-xs text-muted-foreground mb-4">Ocupación · alertas · movimientos · cumplimiento</p>
          <div className="h-72">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} angle={30} domain={[0, 100]} />
                <Radar name="Planta" dataKey="PM" stroke="#15803D" fill="#15803D" fillOpacity={0.18} />
                <Radar name="Bodega" dataKey="BC" stroke="#DC2626" fill="#DC2626" fillOpacity={0.18} />
                <Radar name="Pontón LA" dataKey="PLA" stroke="#1A6B99" fill="#1A6B99" fillOpacity={0.18} />
                <Radar name="Pontón BS" dataKey="PBS" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.18} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-1">Ocupación sedes</h3>
          <p className="text-xs text-muted-foreground mb-4">Porcentaje de uso actual por sede</p>
          {isLoading ? (
            <Skeleton className="h-72 w-full rounded" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="ocup" name="Ocupación" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={estadoColorHex[d.estado]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
