import { estadoLabel, EstadoContainer } from '@/types';
import type { ContainerAPI } from '@/types';

const ORDER: EstadoContainer[] = ['disponible', 'medio', 'critico', 'mantenimiento', 'cuarentena'];

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

interface Props {
  containers?: ContainerAPI[];
}

export const StatusLegend = ({ containers }: Props) => {
  const counts = containers
    ? ORDER.reduce<Partial<Record<EstadoContainer, number>>>((acc, e) => {
        acc[e] = containers.filter((c) => c.estado === e).length;
        return acc;
      }, {})
    : null;

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-card border border-border rounded-lg text-xs">
      {ORDER.map((e) => (
        <div
          key={e}
          className="flex items-center gap-2 px-2 py-1 rounded-md"
          style={{ backgroundColor: TOKEN_BG[e] }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TOKEN_FG[e] }}
          />
          <span className="font-medium" style={{ color: TOKEN_FG[e] }}>
            {estadoLabel[e]}
            {counts !== null && counts[e] !== undefined && (
              <span className="ml-1 opacity-75">({counts[e]})</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
};
