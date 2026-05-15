import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlertas, type Alerta, type AlertaSeveridad } from '@/hooks/useAlertas';
import { tiempoRelativo } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SevConfig {
  titulo: string;
  icon: LucideIcon;
  sectionClass: string;
  textClass: string;
  bgClass: string;
}

const SEV_CONFIG: Record<AlertaSeveridad, SevConfig> = {
  critica: {
    titulo: 'Criticas',
    icon: AlertCircle,
    sectionClass: 'text-destructive',
    textClass: 'text-destructive',
    bgClass: 'bg-destructive/5 border-destructive/30',
  },
  aviso: {
    titulo: 'Avisos',
    icon: AlertTriangle,
    sectionClass: 'text-[hsl(var(--status-medio))]',
    textClass: 'text-[hsl(var(--status-medio))]',
    bgClass: 'bg-[hsl(var(--status-medio))]/5 border-[hsl(var(--status-medio))]/30',
  },
  informativa: {
    titulo: 'Informativas',
    icon: Info,
    sectionClass: 'text-secondary',
    textClass: 'text-secondary',
    bgClass: 'bg-secondary/5 border-secondary/30',
  },
};

const SEV_ORDER: AlertaSeveridad[] = ['critica', 'aviso', 'informativa'];

function groupBySeveridad(alertas: Alerta[]): Map<AlertaSeveridad, Alerta[]> {
  const map = new Map<AlertaSeveridad, Alerta[]>();
  for (const a of alertas) {
    const current = map.get(a.severidad) ?? [];
    current.push(a);
    map.set(a.severidad, current);
  }
  return map;
}

export default function Alertas() {
  const { activas, marcarRevisada, resolver, isLoading } = useAlertas();
  const grupos = groupBySeveridad(activas);

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (activas.length === 0) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          Sin alertas activas.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {SEV_ORDER.map((sev) => {
        const items = grupos.get(sev);
        if (!items || items.length === 0) return null;
        const cfg = SEV_CONFIG[sev];
        const Icon = cfg.icon;
        return (
          <section key={sev}>
            <div className={`flex items-center gap-2 mb-2 ${cfg.sectionClass}`}>
              <Icon className="h-4 w-4" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">{cfg.titulo}</h3>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${cfg.bgClass}`}
                >
                  <div className="text-sm min-w-0">
                    <div className="font-medium">{a.mensaje}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {tiempoRelativo(a.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => marcarRevisada(a.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Revisada
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolver(a.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
