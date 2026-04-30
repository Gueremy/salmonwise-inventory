import { estadoColor, estadoLabel, EstadoContainer } from "@/data/mock";

const order: EstadoContainer[] = ["disponible", "medio", "critico", "mantenimiento", "cuarentena"];
const ranges: Record<EstadoContainer, string> = {
  disponible: "0–40%",
  medio: "41–79%",
  critico: "80–100%",
  mantenimiento: "manual",
  cuarentena: "SERNAPESCA",
};

export const StatusLegend = () => (
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
