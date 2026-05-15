import type { EstadoContainer, EstadoMovimiento } from '@/types';
import { estadoLabel } from '@/types';

const TOKEN_BG: Record<EstadoContainer, string> = {
  disponible:    'var(--color-status-disponible-bg)',
  medio:         'var(--color-status-medio-bg)',
  critico:       'var(--color-status-critico-bg)',
  mantenimiento: 'var(--color-status-mantenimiento-bg)',
  cuarentena:    'var(--color-status-cuarentena-bg)',
};

const TOKEN_FG: Record<EstadoContainer, string> = {
  disponible:    'var(--color-status-disponible)',
  medio:         'var(--color-status-medio)',
  critico:       'var(--color-status-critico)',
  mantenimiento: 'var(--color-status-mantenimiento)',
  cuarentena:    'var(--color-status-cuarentena)',
};

export const StatusBadge = ({ estado }: { estado: EstadoContainer }) => (
  <span
    className="badge-status"
    style={{ backgroundColor: TOKEN_BG[estado], color: TOKEN_FG[estado] }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TOKEN_FG[estado] }} />
    {estadoLabel[estado]}
  </span>
);

const MOV_STYLE: Record<EstadoMovimiento, { bg: string; fg: string; label: string }> = {
  pendiente: { bg: 'var(--color-alerta-aviso-bg)',      fg: 'var(--color-alerta-aviso)',      label: 'Pendiente' },
  aprobado:  { bg: 'var(--color-status-disponible-bg)', fg: 'var(--color-status-disponible)', label: 'Aprobado' },
  rechazado: { bg: 'var(--color-status-critico-bg)',    fg: 'var(--color-status-critico)',    label: 'Rechazado' },
};

export const MovStatusBadge = ({ estado }: { estado: EstadoMovimiento }) => {
  const s = MOV_STYLE[estado];
  return (
    <span className="badge-status" style={{ backgroundColor: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
};
