import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePendingCount, useSync } from "@/hooks/useSync";

export const SyncStatus = () => {
  const online  = useOnlineStatus();
  const pending = usePendingCount();
  const { syncing } = useSync();

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-status-critico)' }}>
        <WifiOff className="h-3.5 w-3.5" />
        <span>Sin conexión</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-alerta-aviso)' }}>
        <Wifi className="h-3.5 w-3.5" />
        <span>{pending} pendiente{pending !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-status-disponible)' }}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Sincronizado</span>
    </div>
  );
};
