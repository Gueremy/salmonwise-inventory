import { EstadoContainer, estadoColor, estadoLabel } from '@/types';

export const StatusBadge = ({ estado }: { estado: EstadoContainer }) => (
  <span
    className="badge-status"
    style={{
      backgroundColor: `${estadoColor[estado]}1F`,
      color: estadoColor[estado],
    }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: estadoColor[estado] }} />
    {estadoLabel[estado]}
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
