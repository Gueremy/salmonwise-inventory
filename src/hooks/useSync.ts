import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { applySyncResults, db } from "@/lib/db";
import { ApiError, isNetworkError, syncMovimientos } from "@/lib/api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function usePendingCount() {
  return useLiveQuery(
    () => db.movimientos_offline.where("status").equals("pending").count(),
    [],
    0,
  ) ?? 0;
}

export function useSync() {
  const { accessToken } = useRole();
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const runningRef = useRef(false);

  const sync = useCallback(async () => {
    if (!online || !accessToken || runningRef.current) return;
    const pending = await db.movimientos_offline.where("status").equals("pending").toArray();
    if (pending.length === 0) return;

    runningRef.current = true;
    setSyncing(true);
    await db.movimientos_offline
      .where("uuid_local")
      .anyOf(pending.map((item) => item.uuid_local))
      .modify((item) => {
        item.intentos += 1;
        delete item.last_error;
      });

    try {
      const response = await syncMovimientos(
        accessToken,
        pending.map((item) => ({ uuid_local: item.uuid_local, ...item.payload })),
      );
      await applySyncResults(pending.map((item) => item.uuid_local), response.resultados);

      const applied = response.resultados.filter((item) => item.accion === "aplicar").length;
      const rejected = response.resultados.filter((item) => item.accion === "rechazar").length;
      if (applied) toast.success(`${applied} movimiento${applied === 1 ? "" : "s"} sincronizado${applied === 1 ? "" : "s"}`);
      if (rejected) toast.error(`${rejected} movimiento${rejected === 1 ? "" : "s"} rechazado${rejected === 1 ? "" : "s"}`);

      ["inventory-snapshot", "dashboard-kpis", "dashboard-galpones", "dashboard-pending-movements", "dashboard-alertas", "movimientos"]
        .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    } catch (error) {
      const shouldReject = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401;
      const message = error instanceof Error ? error.message : "No se pudo sincronizar";
      await db.movimientos_offline
        .where("uuid_local")
        .anyOf(pending.map((item) => item.uuid_local))
        .modify({ status: shouldReject ? "rejected" : "pending", last_error: message });

      if (!isNetworkError(error)) toast.error(message);
    } finally {
      runningRef.current = false;
      setSyncing(false);
    }
  }, [accessToken, online, queryClient]);

  useEffect(() => {
    if (online) void sync();
  }, [online, sync]);

  return { sync, syncing };
}
