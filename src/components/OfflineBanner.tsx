import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePendingCount, useSync } from "@/hooks/useSync";

export const OfflineBanner = () => {
  const online = useOnlineStatus();
  const pending = usePendingCount();
  const { sync, syncing } = useSync();

  if (online && pending === 0) return null;

  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 border-b px-4 py-2 text-sm ${online ? "border-amber-300 bg-amber-50 text-amber-900" : "border-red-300 bg-red-50 text-red-900"}`}>
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          {online
            ? `${pending} movimiento${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"} de sincronizar`
            : `Sin conexion. Los movimientos nuevos se guardaran en este dispositivo${pending ? ` (${pending} pendientes)` : ""}.`}
        </span>
      </div>
      {online && pending > 0 && (
        <Button variant="ghost" size="sm" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando" : "Sincronizar"}
        </Button>
      )}
    </div>
  );
};
