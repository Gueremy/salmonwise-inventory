import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  Legend,
} from "recharts";
import { ocupacionToEstado, estadoColor } from "@/lib/inventory";
import { Bell, FileText, FileSpreadsheet, Ship, Factory, Warehouse, Building2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventorySnapshot } from "@/hooks/use-inventory-snapshot";
import { useRole } from "@/context/RoleContext";
import { fetchManagementSummary } from "@/api/management";
import { downloadReport } from "@/api/reports";
import { toast } from "sonner";

const tipoIcon: Record<string, typeof Building2> = {
  embarcacion: Ship,
  ponton: Ship,
  planta: Factory,
  bodega: Warehouse,
};

export default function Gerencia() {
  const { accessToken, organizacion } = useRole();
  const inventoryQuery = useInventorySnapshot();
  const sedes = useMemo(() => inventoryQuery.data?.sedes ?? [], [inventoryQuery.data?.sedes]);

  const managementQuery = useQuery({
    queryKey: ["gerencia-summary", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchManagementSummary(accessToken!),
  });

  const lineData = managementQuery.data?.movimientos_diarios ?? [];
  const topProducts = managementQuery.data?.top_items ?? [];
  const siteSummaryData = useMemo(() => sedes.map((s) => ({
    nombre: s.nombre, ocupacion: s.ocupacion,
    disponible: Math.max(0, 100 - s.ocupacion),
  })), [sedes]);
  const hasMovementHistory = lineData.some((day) => day.total > 0);

  const handleExport = async (type: "pdf" | "excel") => {
    if (!accessToken) return;
    try {
      const res = await downloadReport(accessToken, type);
      const url = URL.createObjectURL(res.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Reporte ${res.filename} generado exitosamente.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar reporte");
    }
  };

  const chartColors = ["#0284c7", "#22C55E", "#EF4444", "#8B5CF6", "#F59E0B"];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Ejecutivo Gerencial</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visión global multi-sitio de {organizacion.nombre} · Solo lectura
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF ejecutivo
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
        </div>
      </div>

      {/* Tarjetas de Sitios Activos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sedes.map((s) => {
          const Icon = tipoIcon[s.tipo] ?? Building2;
          const est = ocupacionToEstado(s.ocupacion);
          return (
            <div key={s.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estadoColor[est] }} />
              </div>
              <div className="font-semibold text-sm leading-tight">{s.nombre}</div>
              <div className="text-3xl font-bold mt-3">{s.ocupacion}%</div>
              <div className="text-xs text-muted-foreground">Ocupación promedio</div>
              <div
                className={`mt-3 flex items-center gap-1.5 text-xs ${
                  s.alertas > 0 ? "text-destructive font-medium" : "text-muted-foreground"
                }`}
              >
                <Bell className="h-3 w-3" /> {s.alertas} alerta{s.alertas !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
        {sedes.length === 0 && (
          <div className="col-span-full p-8 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
            No hay sitios registrados en la organización.
          </div>
        )}
      </div>

      {managementQuery.isError && (
        <div role="alert" className="rounded border border-destructive/30 p-3 text-sm text-destructive">
          No se pudo consultar el historial gerencial del backend.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-1">Movimientos confirmados por día</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos 15 días · hora UTC</p>
          {hasMovementHistory ? <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke={chartColors[0]} strokeWidth={2} />
                <Line type="monotone" dataKey="salidas" name="Salidas" stroke={chartColors[1]} strokeWidth={2} />
                <Line type="monotone" dataKey="traslados" name="Traslados" stroke={chartColors[2]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p className="py-20 text-center text-sm text-muted-foreground">No hay movimientos confirmados en los últimos 15 días.</p>}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-1">Ocupación actual por sitio</h3>
          <p className="text-xs text-muted-foreground mb-4">Porcentaje ocupado y disponible</p>
          {siteSummaryData.length ? <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={siteSummaryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ocupacion" name="Ocupación" fill={chartColors[0]} />
                <Bar dataKey="disponible" name="Disponible" fill={chartColors[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="py-20 text-center text-sm text-muted-foreground">No hay sitios para comparar.</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Ítems con más movimientos confirmados en 15 días
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">#</th>
              <th className="text-left px-5 py-3 font-medium">Ítem / Producto</th>
              <th className="text-left px-5 py-3 font-medium">Movimientos</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => (
              <tr key={p.id_item} className="border-t border-border">
                <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-5 py-3 font-medium">{p.nombre}</td>
                <td className="px-5 py-3">{p.movimientos}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No hay movimientos confirmados en los últimos 15 días.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
