import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, AlertCircle, Info, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { ApiAlerta, fetchAlertasActivas } from "@/lib/api";

const severityConfig = {
  critica: { titulo: "Criticas", bg: "bg-destructive/5 border-destructive/30", text: "text-destructive", icon: AlertCircle },
  media: { titulo: "Avisos", bg: "bg-status-medio/5 border-status-medio/30", text: "text-status-medio", icon: AlertTriangle },
  baja: { titulo: "Informativas", bg: "bg-secondary/5 border-secondary/30", text: "text-secondary", icon: Info },
} as const;

const fallbackConfig = { titulo: "Otras", bg: "bg-muted/40 border-border", text: "text-muted-foreground", icon: Info };

function formatDate(value: string | null) {
  if (!value) return "Sin fecha registrada";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function groupAlertas(alertas: ApiAlerta[]) {
  return alertas.reduce<Record<string, ApiAlerta[]>>((groups, alerta) => {
    const key = alerta.severidad.toLowerCase();
    groups[key] = [...(groups[key] ?? []), alerta];
    return groups;
  }, {});
}

export default function Alertas() {
  const { accessToken } = useRole();
  const alertasQuery = useQuery({
    queryKey: ["alertas-activas", accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: () => fetchAlertasActivas(accessToken!),
  });
  const grupos = useMemo(() => groupAlertas(alertasQuery.data ?? []), [alertasQuery.data]);
  const orderedKeys = ["critica", "media", "baja", ...Object.keys(grupos).filter((key) => !["critica", "media", "baja"].includes(key))];

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Alertas activas</h2>
        <p className="text-sm text-muted-foreground">Datos live desde GET /alertas/activas.</p>
      </div>

      {alertasQuery.isLoading && <div className="text-sm text-muted-foreground">Cargando alertas...</div>}
      {alertasQuery.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar las alertas activas desde la API.
        </div>
      )}

      {alertasQuery.isSuccess && alertasQuery.data.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No hay alertas activas para tu sede.
        </div>
      )}

      {orderedKeys.map((key) => {
        const items = grupos[key] ?? [];
        if (items.length === 0) return null;
        const config = severityConfig[key as keyof typeof severityConfig] ?? fallbackConfig;
        const Icon = config.icon;

        return (
          <section key={key}>
            <div className={`flex items-center gap-2 mb-2 ${config.text}`}>
              <Icon className="h-4 w-4" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">{config.titulo}</h3>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((alerta) => (
                <div key={alerta.id} className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${config.bg}`}>
                  <div className="text-sm">
                    <div className="font-medium">{alerta.descripcion}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {alerta.tipo} · container {alerta.id_container} · {formatDate(alerta.fecha_generacion)}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to={`/inventario`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver inventario
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
