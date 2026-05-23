import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, FileText, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MovStatusBadge } from "@/components/StatusBadge";
import { useRole } from "@/context/RoleContext";
import { approveMovimiento, fetchMovimientos, rejectMovimiento } from "@/lib/api";

const prettyType: Record<string, string> = {
  entrada_proveedor: "Entrada proveedor",
  salida_produccion: "Salida produccion",
  traslado_interno: "Traslado interno",
  correccion: "Correccion",
};

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Movimientos() {
  const { accessToken, usuario } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const movimientosQuery = useQuery({
    queryKey: ["movimientos", accessToken, search],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (search.trim()) {
        params.set("q", search.trim());
      }
      const response = await fetchMovimientos(accessToken!, params.toString());
      return response.items;
    },
  });

  const selected = useMemo(
    () => movimientosQuery.data?.find((item) => item.id === selectedId) ?? null,
    [movimientosQuery.data, selectedId],
  );

  const canReview = usuario.rol === "jefe_bodega" || usuario.rol === "super_admin";

  const approveMutation = useMutation({
    mutationFn: ({ token, id }: { token: string; id: string }) => approveMovimiento(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setSelectedId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ token, id, motivo }: { token: string; id: string; motivo: string }) => rejectMovimiento(token, id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setMotivoRechazo("");
      setSelectedId(null);
    },
  });

  const items = movimientosQuery.data ?? [];

  return (
    <div className="p-6 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar producto, lote, operario o container"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" disabled><FileText className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button variant="outline" size="sm" disabled><FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {["Fecha/Hora", "Tipo", "Producto", "Lote", "Container", "Operario", "Estado", "Aprobador"].map((header) => (
                  <th key={header} className="text-left px-4 py-3 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer transition"
                >
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(item.fecha_hora)}</td>
                  <td className="px-4 py-3">{prettyType[item.tipo] ?? item.tipo}</td>
                  <td className="px-4 py-3 font-medium">{item.producto_nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.numero_lote}</td>
                  <td className="px-4 py-3">{item.container_codigo}</td>
                  <td className="px-4 py-3">{item.operario_nombre}</td>
                  <td className="px-4 py-3"><MovStatusBadge estado={item.estado} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{item.aprobador_nombre ?? "—"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    No hay movimientos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedId(null)}>
          <aside
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border p-6 overflow-y-auto animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-1">{selected.producto_nombre}</h3>
            <MovStatusBadge estado={selected.estado} />
            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Fecha/Hora", formatDate(selected.fecha_hora)],
                ["Tipo", prettyType[selected.tipo] ?? selected.tipo],
                ["Lote", selected.numero_lote],
                ["Container origen", selected.container_codigo],
                ["Container destino", selected.container_destino_codigo ?? "—"],
                ["Operario", selected.operario_nombre],
                ["Aprobador", selected.aprobador_nombre ?? "—"],
                ["Cantidad", selected.cantidad],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-md bg-secondary/5 border border-secondary/30">
              <div className="text-xs font-semibold text-secondary mb-2">Datos regulatorios</div>
              <div className="text-xs space-y-1.5 text-muted-foreground">
                <div>Proveedor: <span className="text-foreground font-medium">{selected.nombre_proveedor ?? "—"}</span></div>
                <div>Guia: <span className="text-foreground font-medium">{selected.num_guia_despacho ?? "—"}</span></div>
                <div>Vencimiento: <span className="text-foreground font-medium">{selected.fecha_vencimiento ? formatDate(selected.fecha_vencimiento) : "—"}</span></div>
                <div>Registro sanitario: <span className="text-foreground font-medium">{selected.registro_sanitario ?? "—"}</span></div>
                <div>Temp. almacen: <span className="text-foreground font-medium">{selected.temperatura_almacen ?? "—"}</span></div>
              </div>
            </div>

            {canReview && selected.estado === "pendiente" && (
              <div className="mt-5 space-y-3">
                <Button
                  className="w-full"
                  onClick={() => accessToken && approveMutation.mutate({ token: accessToken, id: selected.id })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar movimiento
                </Button>
                <Textarea
                  rows={3}
                  placeholder="Motivo de rechazo"
                  value={motivoRechazo}
                  onChange={(event) => setMotivoRechazo(event.target.value)}
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={!motivoRechazo.trim() || approveMutation.isPending || rejectMutation.isPending}
                  onClick={() => accessToken && rejectMutation.mutate({ token: accessToken, id: selected.id, motivo: motivoRechazo.trim() })}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Rechazar movimiento
                </Button>
              </div>
            )}

            {selected.motivo_rechazo && (
              <div className="mt-5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <div className="font-semibold text-destructive mb-1">Motivo de rechazo</div>
                <div>{selected.motivo_rechazo}</div>
              </div>
            )}

            <Button className="w-full mt-5" variant="outline" onClick={() => setSelectedId(null)}>Cerrar</Button>
          </aside>
        </div>
      )}
    </div>
  );
}
