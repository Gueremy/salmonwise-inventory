import { EstadoContainer, estadoColor, estadoLabel } from "@/lib/inventory";

const textColors: Record<EstadoContainer, string> = {
  disponible: "hsl(var(--status-disponible-text))",
  medio: "hsl(var(--status-medio-text))",
  critico: "hsl(var(--status-critico-text))",
  mantenimiento: "hsl(var(--status-mantenimiento-text))",
  cuarentena: "hsl(var(--status-cuarentena-text))",
};

export const StatusBadge = ({ estado }: { estado?: string }) => (
  <span
    className="badge-status"
    style={{
      backgroundColor: estadoColor[estado as EstadoContainer]
        ? estadoColor[estado as EstadoContainer].replace(/\)$/, " / 0.12)") : "#9CA3AF1F",
      color: textColors[estado as EstadoContainer] ?? "#374151",
    }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: estadoColor[estado as EstadoContainer] ?? "#9CA3AF" }} />
    {estadoLabel[estado as EstadoContainer] ?? estado ?? "Desconocido"}
  </span>
);

export const MovStatusBadge = ({ estado }: { estado: "pendiente" | "aprobado" | "rechazado" }) => {
  const map = {
    pendiente: { bg: "#FEF3C7", fg: "#B45309", label: "Pendiente" },
    aprobado: { bg: "#DCFCE7", fg: "#15803D", label: "Aprobado" },
    rechazado: { bg: "#FEE2E2", fg: "#B91C1C", label: "Rechazado" },
  }[estado];
  return (
    <span className="badge-status" style={{ backgroundColor: map.bg, color: map.fg }}>
      {map.label}
    </span>
  );
};
