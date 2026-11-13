import { estadoColor, estadoLabel, EstadoContainer } from "@/lib/inventory";
import { useRole } from "@/context/RoleContext";

const order: EstadoContainer[] = ["disponible", "medio", "critico", "mantenimiento", "cuarentena"];
export const StatusLegend = () => {
  const { organizacion } = useRole();
  const thresholds = organizacion.configuracion.umbrales;
  const available = thresholds?.disponible_max ?? 40;
  const critical = thresholds?.critico_min ?? 80;
  const availableLabel = Math.floor(available);
  const criticalLabel = Math.ceil(critical);
  const ranges: Record<EstadoContainer, string> = {
    disponible: `0–${availableLabel}%`,
    medio: `${availableLabel + 1}–${criticalLabel - 1}%`,
    critico: `${criticalLabel}–100%`,
    mantenimiento: "manual",
    cuarentena: "retenido",
  };
  return (
  <div className="flex flex-wrap gap-3 p-3 bg-card border border-border rounded-lg text-xs">
    {order.map((e) => (
      <div key={e} className="flex items-center gap-2">
        <span className="h-3 w-3 rounded" style={{ backgroundColor: estadoColor[e] }} />
        <span className="font-medium">{estadoLabel[e]}</span>
        <span className="text-muted-foreground">({ranges[e]})</span>
      </div>
    ))}
  </div>
  );
};
