import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePendingCount, useSync } from "@/hooks/useSync";

export const OfflineBanner = () => {
  const online  = useOnlineStatus();
  const pending = usePendingCount();
  const { sync, syncing } = useSync();
  const [visible, setVisible] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (!online) {
      setVisible(true);
      setJustSynced(false);
    }
  }, [online]);

  useEffect(() => {
    if (online && pending === 0 && visible && !justSynced) {
      setJustSynced(true);
      const t = setTimeout(() => { setVisible(false); setJustSynced(false); }, 3000);
      return () => clearTimeout(t);
    }
  }, [online, pending, visible, justSynced]);

  if (!visible) return null;

  const handleSync = () => sync();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-between gap-3 text-sm font-medium"
      style={{
        backgroundColor: justSynced ? 'var(--color-status-disponible-bg)' : 'var(--color-alerta-aviso-bg)',
        color:            justSynced ? 'var(--color-status-disponible)'    : 'var(--color-alerta-aviso)',
        borderBottom:     '1px solid',
        borderColor:      justSynced ? 'var(--color-status-disponible)'    : 'var(--color-alerta-aviso)',
      }}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 flex-shrink-0" />
        {justSynced ? (
          <span>Conexión restaurada — datos sincronizados.</span>
        ) : (
          <span>
            Sin conexión — trabajando sin internet
            {pending > 0 && ` (${pending} movimiento${pending !== 1 ? 's' : ''} pendiente${pending !== 1 ? 's' : ''} de guardar)`}
          </span>
        )}
      </div>

      {online && pending > 0 && !syncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          className="min-h-[36px] font-semibold"
          style={{ color: 'var(--color-alerta-aviso)' }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Sincronizar ahora
        </Button>
      )}
      {syncing && (
        <span className="text-xs flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando...
        </span>
      )}
    </div>
  );
};
