import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useMutation } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { apiClient } from "@/lib/apiClient";
import { useOnlineStatus } from "./useOnlineStatus";
import { useAuthStore } from "@/store/authStore";

export function usePendingCount(): number {
  const count = useLiveQuery(
    () => db.movimientos_offline.where('sincronizado').equals(0).count(),
    [],
    0
  );
  return count ?? 0;
}

interface SyncPayload {
  movimientos: Array<Record<string, unknown>>;
  id_sede: string;
}

export function useSync() {
  const usuario = useAuthStore((s) => s.usuario);
  const online  = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: SyncPayload) =>
      apiClient.post('/movimientos/sync', body).then((r) => r.data),
  });

  const sync = useCallback(async () => {
    if (!online || !usuario?.id_sede) return;
    const pending = await db.movimientos_offline
      .where('sincronizado').equals(0)
      .toArray();
    if (pending.length === 0) return;

    setSyncing(true);
    try {
      await mutation.mutateAsync({
        movimientos: pending.map((p) => p.payload),
        id_sede: usuario.id_sede!,
      });
      await db.movimientos_offline
        .where('uuid_local').anyOf(pending.map((p) => p.uuid_local))
        .modify({ sincronizado: true });
    } catch {
      await db.movimientos_offline
        .where('uuid_local').anyOf(pending.map((p) => p.uuid_local))
        .modify((item) => { item.intentos = (item.intentos ?? 0) + 1; });
    } finally {
      setSyncing(false);
    }
  }, [online, usuario, mutation]);

  useEffect(() => {
    if (online) sync();
  }, [online, sync]);

  return { sync, syncing, isPending: mutation.isPending };
}
