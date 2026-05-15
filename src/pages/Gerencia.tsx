import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Legend,
} from "recharts";
import { Bell, FileText, FileSpreadsheet, Ship, Factory, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSedes } from "@/hooks/useSedes";
import { useDescargarReporte } from "@/hooks/useReportes";
import { ocupacionToEstado, estadoColorHex } from "@/types";
import type { TipoSede } from "@/types";

const tipoIcon: Record<TipoSede, React.ComponentType<{ className?: string }>> = {
  embarcacion: Ship,
  planta:      Factory,
  bodega:      Warehouse,
};

const radarData = [
  { metric: "Ocupación",         PM: 45, BC: 88, PLA: 72, PBS: 31 },
  { metric: "Alertas",           PM: 0,  BC: 60, PLA: 20, PBS: 0 },
  { metric: "Movimientos",       PM: 70, BC: 50, PLA: 35, PBS: 20 },
  { metric: "Cumpl. SERNAPESCA", PM: 95, BC: 80, PLA: 92, PBS: 98 },
];

export default function Gerencia() {
  const { data: sedes, isLoading } = useSedes();
  const descargar = useDescargarReporte();

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
          : sedes?.map((s) => {
              const Icon = tipoIcon[s.tipo_operacion] ?? Warehouse;
              const pct = s.capacidad_total > 0
                ? Math.round((s.ocupacion_actual / s.capacidad_total) * 100)
                : 0;
              const est = ocupacionToEstado(pct);
              return (
                <div key={s.id} className="bg-card border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: estadoColorHex[est] }}
                    />
                  </div>
                  <div className="font-semibold text-sm leading-tight">{s.nombre}</div>
                  <div className="text-3xl font-bold mt-3">{pct}%</div>
                  <div className="text-xs text-muted-foreground">Ocupación</div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bell className="h-3 w-3" />
                    {s.activo ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
              );
            })}
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
                <LineChart data={sedes?.map((s) => ({
                  nombre: s.nombre.slice(0, 10),
                  ocup: s.capacidad_total > 0 ? Math.round((s.ocupacion_actual / s.capacidad_total) * 100) : 0,
                })) ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="ocup" name="Ocupación" stroke="#1A6B99" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
