import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Legend } from "recharts";
import { ocupacionToEstado, estadoColor } from "@/lib/inventory";
import { Bell, FileText, FileSpreadsheet, Ship, Factory, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";

const tipoIcon = { embarcacion: Ship, planta: Factory, bodega: Warehouse };

const lineData = Array.from({ length: 30 }).map((_, i) => ({
  dia: `D${i + 1}`,
  s1: 60 + Math.round(Math.sin(i / 4) * 10) + (i / 6),
  s2: 40 + Math.round(Math.cos(i / 5) * 8) + (i / 8),
  s3: 75 + Math.round(Math.sin(i / 3) * 12),
  s4: 25 + Math.round(Math.cos(i / 6) * 6) + (i / 10),
}));

const radarData = [
  { metric: "Ocupación", PM: 45, BC: 88, PLA: 72, PBS: 31 },
  { metric: "Alertas", PM: 0, BC: 60, PLA: 20, PBS: 0 },
  { metric: "Movimientos", PM: 70, BC: 50, PLA: 35, PBS: 20 },
  { metric: "Cumpl. SERNAPESCA", PM: 95, BC: 80, PLA: 92, PBS: 98 },
];

const top5 = [
  { producto: "Alimento Skretting 5mm", rotacion: "1.245 mov", trend: "+18%" },
  { producto: "Alimento 3mm", rotacion: "892 mov", trend: "+9%" },
  { producto: "Alimento 8mm", rotacion: "643 mov", trend: "-4%" },
  { producto: "Vitamina C Plus", rotacion: "311 mov", trend: "+22%" },
  { producto: "Antibiótico XYZ", rotacion: "187 mov", trend: "+5%" },
];

export default function Gerencia() {
  const inventoryQuery = useInventorySnapshot();
  const sedes = inventoryQuery.data?.sedes ?? [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Gerencia</h1>
          <p className="text-sm text-muted-foreground">Visión global multi-sede · solo lectura</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileText className="h-4 w-4 mr-1.5" />PDF ejecutivo</Button>
          <Button variant="outline"><FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel</Button>
        </div>
      </div>

      {/* Sede cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sedes.map((s) => {
          const Icon = tipoIcon[s.tipo];
          const est = ocupacionToEstado(s.ocupacion);
          return (
            <div key={s.id} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[est] }} />
              </div>
              <div className="font-semibold text-sm leading-tight">{s.nombre}</div>
              <div className="text-3xl font-bold mt-3">{s.ocupacion}%</div>
              <div className="text-xs text-muted-foreground">Ocupación</div>
              <div className={`mt-3 flex items-center gap-1.5 text-xs ${s.alertas > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                <Bell className="h-3 w-3" /> {s.alertas} alertas
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-1">Ocupación global · últimos 30 días</h3>
          <p className="text-xs text-muted-foreground mb-4">Evolución por sede</p>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="s1" name="Pontón Los Ángeles" stroke="#1B6CA8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="s2" name="Planta Pto Montt" stroke="#22C55E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="s3" name="Bodega Central" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="s4" name="Pontón Bahía Sur" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold mb-1">Comparativo multi-sede</h3>
          <p className="text-xs text-muted-foreground mb-4">Ocupación · alertas · movimientos · cumplimiento</p>
          <div className="h-72">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} angle={30} domain={[0, 100]} />
                <Radar name="Pto Montt" dataKey="PM" stroke="#22C55E" fill="#22C55E" fillOpacity={0.18} />
                <Radar name="Bodega Central" dataKey="BC" stroke="#EF4444" fill="#EF4444" fillOpacity={0.18} />
                <Radar name="Pontón LA" dataKey="PLA" stroke="#1B6CA8" fill="#1B6CA8" fillOpacity={0.18} />
                <Radar name="Pontón BS" dataKey="PBS" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.18} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Top 5 productos con mayor rotación · este mes</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">Producto</th>
              <th className="text-left px-5 py-3 font-medium">Rotación</th>
              <th className="text-left px-5 py-3 font-medium">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((p, i) => (
              <tr key={p.producto} className="border-t border-border">
                <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-5 py-3 font-medium">{p.producto}</td>
                <td className="px-5 py-3">{p.rotacion}</td>
                <td className={`px-5 py-3 font-medium ${p.trend.startsWith("+") ? "text-status-disponible" : "text-destructive"}`}>{p.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
