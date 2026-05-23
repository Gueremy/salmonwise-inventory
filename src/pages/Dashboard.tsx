import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Box, Bell, ArrowUpRight, Clock } from "lucide-react";
import { galpones, movimientosPendientes, ocupacionToEstado, estadoColor } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { fetchDashboardGalpones, fetchDashboardKpis } from "@/lib/api";

const KpiCard = ({ label, value, sub, icon: Icon, accent }: any) => (
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

export default function Dashboard() {
  const { accessToken, setOnline } = useRole();
  const [pendientes, setPendientes] = useState(movimientosPendientes);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const galponesPM = galpones.filter((g) => g.sedeId === "s2");

  const fallbackData = galponesPM.map((g) => ({
    name: `${g.codigo} - ${g.nombre}`,
    ocup: g.ocupacion_prom,
    estado: ocupacionToEstado(g.ocupacion_prom),
  }));

  const kpisQuery = useQuery({
    queryKey: ["dashboard-kpis", accessToken],
    queryFn: () => fetchDashboardKpis(accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const galponesQuery = useQuery({
    queryKey: ["dashboard-galpones", accessToken],
    queryFn: () => fetchDashboardGalpones(accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (kpisQuery.isSuccess || galponesQuery.isSuccess) {
      setOnline(true);
      return;
    }

    if (kpisQuery.isError || galponesQuery.isError) {
      setOnline(false);
    }
  }, [galponesQuery.isError, galponesQuery.isSuccess, kpisQuery.isError, kpisQuery.isSuccess, setOnline]);

  const data = galponesQuery.data ?? fallbackData;
  const liveKpis = kpisQuery.data;

  const aprobar = (id: string) => {
    setPendientes((p) => p.filter((x) => x.id !== id));
    toast.success("Movimiento aprobado");
  };

  const rechazar = () => {
    if (!motivo.trim()) return;
    setPendientes((p) => p.filter((x) => x.id !== rejecting));
    toast.success("Movimiento rechazado");
    setRejecting(null);
    setMotivo("");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Ocupacion Global"
          value={`${Math.round(liveKpis?.ocupacion_global ?? 67)}%`}
          sub={liveKpis ? "Dato live desde backend" : "+3% vs semana pasada"}
          icon={Box}
          accent="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Alertas Activas"
          value={String(liveKpis?.alertas_activas ?? 3)}
          sub={liveKpis ? "Dato live desde backend" : "1 critica"}
          icon={Bell}
          accent="bg-destructive/10 text-destructive"
        />
        <KpiCard
          label="Movimientos Hoy"
          value={String(liveKpis?.movimientos_hoy ?? 12)}
          sub={liveKpis ? "Dato live desde backend" : "3 pendientes"}
          icon={ArrowUpRight}
          accent="bg-status-disponible/10 text-status-disponible"
        />
        <KpiCard
          label="Prox. Vencimiento"
          value={liveKpis?.proximo_vencimiento != null ? `${liveKpis.proximo_vencimiento} dias` : "4 dias"}
          sub={liveKpis ? "Dato live desde backend" : "LOT-2026-03-089"}
          icon={Clock}
          accent="bg-status-medio/10 text-status-medio"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Ocupacion por galpon</h3>
              <p className="text-xs text-muted-foreground">
                {galponesQuery.data ? "Datos live del backend" : "Planta Puerto Montt"}
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="ocup" radius={[6, 6, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={estadoColor[d.estado]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Alertas recientes</h3>
          <div className="space-y-3">
            {[
              { txt: "G2-C08 al 95% de capacidad", time: "hace 1h", color: "bg-destructive" },
              { txt: "LOT-2026-03-089 vence en 3 dias", time: "hace 2h", color: "bg-destructive" },
              { txt: "G3-C02 sin revision > 48h", time: "hace 5h", color: "bg-status-medio" },
              { txt: "Sincronizacion offline OK", time: "hace 8h", color: "bg-secondary" },
            ].map((a, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/40">
                <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${a.color}`} />
                <div className="min-w-0">
                  <div className="text-sm">{a.txt}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              {pendientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">Sin movimientos pendientes</td>
                </tr>
              )}
              {pendientes.map((m, i) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{m.producto}</td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{m.tipo.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3">{m.operario}</td>
                  <td className="px-5 py-3">{m.galpon}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.hora}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Button size="sm" variant="outline" className="border-status-disponible/40 text-status-disponible hover:bg-status-disponible/10" onClick={() => aprobar(m.id)}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setRejecting(m.id)}>
                      Rechazar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo del rechazo</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Indica el motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={!motivo.trim()} onClick={rechazar}>Confirmar rechazo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
