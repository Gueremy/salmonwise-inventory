import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { getPendingMovementsCount } from "@/offline/movementQueue";
import { syncAllPending } from "@/offline/syncEngine";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const OfflineStatusIndicator = () => {
  const { accessToken, online, setOnline, organizacion } = useRole();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkPending = async () => {
    try {
      const count = await getPendingMovementsCount();
      setPendingCount(count);
    } catch {
      // IndexedDB puede estar cerrado
    }
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 5000);

    const handleOnline = () => {
      setOnline(true);
      if (accessToken) {
        handleSync();
      }
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [accessToken, setOnline]);

  const handleSync = async () => {
    if (!accessToken || syncing) return;
    setSyncing(true);
    try {
      const res = await syncAllPending(accessToken, organizacion.id);
      if (res.total > 0) {
        toast.success(`Sincronización completa: ${res.sincronizados} procesados, ${res.rechazados} rechazados.`);
        queryClient.invalidateQueries({ queryKey: ["movimientos"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      }
      await checkPending();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar movimientos");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={!online || syncing}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-50"
          title="Movimientos almacenados localmente pendientes de sincronizar"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{pendingCount} Pendiente{pendingCount > 1 ? "s" : ""}</span>
        </button>
      )}

      <div
        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition ${
          online
            ? "bg-status-disponible/10 text-status-disponible border border-status-disponible/20"
            : "bg-status-medio/10 text-status-medio border border-status-medio/20"
        }`}
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        <span>{online ? "ONLINE" : "OFFLINE"}</span>
      </div>
    </div>
  );
};
