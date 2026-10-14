import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { getPendingMovementsCount, getRejectedMovements } from "@/offline/movementQueue";
import type { LocalMovementRecord } from "@/offline/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { syncAllPending } from "@/offline/syncEngine";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const OfflineStatusIndicator = () => {
  const { accessToken, online, setOnline, organizacion, usuario } = useRole();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [rejected, setRejected] = useState<LocalMovementRecord[]>([]);
  const [syncing, setSyncing] = useState(false);

  const checkPending = useCallback(async () => {
    try {
      const count = await getPendingMovementsCount(organizacion.id, usuario.id);
      setPendingCount(count);
      setRejected(await getRejectedMovements(organizacion.id, usuario.id));
    } catch {
      // IndexedDB puede estar cerrado
    }
  }, [organizacion.id, usuario.id]);

  const handleSync = useCallback(async () => {
    if (!accessToken || syncing) return;
    setSyncing(true);
    try {
      const res = await syncAllPending(accessToken, organizacion.id, usuario.id);
      if (res.total > 0) {
        if (res.rechazados) toast.error(`${res.rechazados} movimientos rechazados. Revisa el motivo en el indicador de sincronización.`);
        else toast.success(`Sincronización completa: ${res.sincronizados} movimientos recibidos por el servidor.`);
        queryClient.invalidateQueries({ queryKey: ["movimientos"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      }
      await checkPending();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar movimientos");
    } finally {
      setSyncing(false);
    }
  }, [accessToken, syncing, organizacion.id, usuario.id, queryClient, checkPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
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
  }, [accessToken, setOnline, checkPending, handleSync]);

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

      {rejected.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mr-1" /> {rejected.length} rechazado{rejected.length > 1 ? "s" : ""}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Movimientos rechazados</DialogTitle>
              <DialogDescription>Estos movimientos no se reintentan automáticamente. Revisa el motivo antes de crear una nueva operación.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 overflow-y-auto space-y-2 text-sm">
              {rejected.map((movement) => (
                <div key={movement.uuid_local} className="rounded border p-2">
                  <div>Ítem {movement.id_item} · {movement.cantidad} {movement.unidad_medida}</div>
                  <div className="text-destructive">{movement.last_error || "Rechazado por el servidor"}</div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
