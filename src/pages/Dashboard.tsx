import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Box, Bell, ArrowUpRight, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import {
  ApiAlerta,
  ApiMovimientoListItem,
  approveMovimiento,
  fetchAlertasActivas,
  fetchDashboardGalpones,
  fetchDashboardKpis,
  fetchMovimientos,
  rejectMovimiento,
} from "@/lib/api";
import { estadoColor } from "@/lib/inventory";

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

function formatDate(dateValue: string | null) {
  if (!dateValue) return "Sin fecha";
  return new Date(dateValue).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyType(tipo: ApiMovimientoListItem["tipo"]) {
  return tipo.replace(/_/g, " ");
}

function alertColor(severidad: ApiAlerta["severidad"]) {
  if (severidad === "critica") return "bg-destructive";
  if (severidad === "media") return "bg-status-medio";
  return "bg-secondary";
}

export default function Dashboard() {
  const { accessToken, setOnline, usuario } = useRole();
  const queryClient = useQueryClient();
  const canReview = usuario.rol === "jefe_bodega" || usuario.rol === "super_admin";
  const [rejecting, setRejecting] = useState<ApiMovimientoListItem | null>(null);
  const [motivo, setMotivo] = useState("");

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

  const alertasQuery = useQuery({
    queryKey: ["dashboard-alertas", accessToken],
    queryFn: async () => {
      const alertas = await fetchAlertasActivas(accessToken!);
      return [...alertas].sort((left, right) => {
        const leftTime = left.fecha_generacion ? new Date(left.fecha_generacion).getTime() : 0;
        const rightTime = right.fecha_generacion ? new Date(right.fecha_generacion).getTime() : 0;
        return rightTime - leftTime;
      });
    },
    enabled: Boolean(accessToken),
    retry: false,
  });

  const pendingQuery = useQuery({
    queryKey: ["dashboard-pending-movements", accessToken],
    enabled: Boolean(accessToken) && canReview,
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        estado: "pendiente",
        limit: "20",
      });
      const response = await fetchMovimientos(accessToken!, params.toString());
      return response.items;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ token, id }: { token: string; id: string }) => approveMovimiento(token, id),
    onSuccess: () => {
      toast.success("Movimiento aprobado");
      queryClient.invalidateQueries({ queryKey: ["dashboard-pending-movements"] });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-galpones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alertas"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo aprobar el movimiento");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ token, id, motivoRechazo }: { token: string; id: string; motivoRechazo: string }) =>
      rejectMovimiento(token, id, motivoRechazo),
    onSuccess: () => {
      toast.success("Movimiento rechazado");
      queryClient.invalidateQueries({ queryKey: ["dashboard-pending-movements"] });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-galpones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alertas"] });
      setRejecting(null);
      setMotivo("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo rechazar el movimiento");
    },
  });

  const hasLiveSuccess =
    kpisQuery.isSuccess ||
    galponesQuery.isSuccess ||
    alertasQuery.isSuccess ||
    (canReview && pendingQuery.isSuccess);

  const hasLiveFailure =
    kpisQuery.isError &&
    galponesQuery.isError &&
    alertasQuery.isError &&
    (!canReview || pendingQuery.isError);

  useEffect(() => {
    if (hasLiveSuccess) {
      setOnline(true);
      return;
    }

    if (hasLiveFailure) {
      setOnline(false);
    }
  }, [hasLiveFailure, hasLiveSuccess, setOnline]);

  const chartData = galponesQuery.data ?? [];
  const liveKpis = kpisQuery.data;
  const recentAlerts = (alertasQuery.data ?? []).slice(0, 4);
  const pendingItems = pendingQuery.data ?? [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Ocupacion Global"
          value={liveKpis ? `${Math.round(liveKpis.ocupacion_global)}%` : kpisQuery.isLoading ? "..." : "--"}
          sub={liveKpis ? "Dato live desde backend" : "Sin datos live disponibles"}
          icon={Box}
          accent="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Alertas Activas"
          value={liveKpis ? String(liveKpis.alertas_activas) : kpisQuery.isLoading ? "..." : "--"}
          sub={liveKpis ? "Dato live desde backend" : "Sin datos live disponibles"}
          icon={Bell}
          accent="bg-destructive/10 text-destructive"
        />
        <KpiCard
          label="Movimientos Hoy"
          value={liveKpis ? String(liveKpis.movimientos_hoy) : kpisQuery.isLoading ? "..." : "--"}
          sub={liveKpis ? "Dato live desde backend" : "Sin datos live disponibles"}
          icon={ArrowUpRight}
          accent="bg-status-disponible/10 text-status-disponible"
        />
        <KpiCard
          label="Prox. Vencimiento"
          value={liveKpis?.proximo_vencimiento != null ? `${liveKpis.proximo_vencimiento} dias` : kpisQuery.isLoading ? "..." : "--"}
          sub={liveKpis ? "Dato live desde backend" : "Sin datos live disponibles"}
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
                {galponesQuery.data ? "Datos live del backend" : galponesQuery.isError ? "No se pudo cargar la API" : "Cargando datos live"}
              </p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-72 rounded-md border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
              No hay datos de ocupacion disponibles.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    {chartData.map((item, index) => (
                      <Cell key={index} fill={estadoColor[item.estado]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border/60 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Alertas recientes</h3>
          <div className="space-y-3">
            {recentAlerts.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                {alertasQuery.isError ? "No se pudieron cargar las alertas." : "No hay alertas activas."}
              </div>
            )}
            {recentAlerts.map((alerta) => (
              <div key={alerta.id} className="flex gap-3 p-3 rounded-md bg-muted/40">
                <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${alertColor(alerta.severidad)}`} />
                <div className="min-w-0">
                  <div className="text-sm">{alerta.descripcion}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDate(alerta.fecha_generacion)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canReview && (
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
                {pendingQuery.isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">Cargando movimientos pendientes...</td>
                  </tr>
                )}
                {pendingQuery.isError && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">No se pudieron cargar los movimientos pendientes.</td>
                  </tr>
                )}
                {!pendingQuery.isLoading && !pendingQuery.isError && pendingItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">Sin movimientos pendientes</td>
                  </tr>
                )}
                {pendingItems.map((movement, index) => (
                  <tr key={movement.id} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="px-5 py-3 text-muted-foreground">{index + 1}</td>
                    <td className="px-5 py-3 font-medium">{movement.producto_nombre}</td>
                    <td className="px-5 py-3 capitalize text-muted-foreground">{prettyType(movement.tipo)}</td>
                    <td className="px-5 py-3">{movement.operario_nombre}</td>
                    <td className="px-5 py-3">{movement.galpon_codigo}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(movement.fecha_hora)}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-status-disponible/40 text-status-disponible hover:bg-status-disponible/10"
                        onClick={() => accessToken && approveMutation.mutate({ token: accessToken, id: movement.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setRejecting(movement)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
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
      )}

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo del rechazo</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Indica el motivo (obligatorio)" value={motivo} onChange={(event) => setMotivo(event.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(null);
                setMotivo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo.trim() || !rejecting || rejectMutation.isPending}
              onClick={() =>
                accessToken &&
                rejecting &&
                rejectMutation.mutate({
                  token: accessToken,
                  id: rejecting.id,
                  motivoRechazo: motivo.trim(),
                })
              }
            >
              <XCircle className="h-4 w-4 mr-2" /> Confirmar rechazo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
