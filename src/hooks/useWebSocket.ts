import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { API_BASE_URL } from "@/lib/api";

const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const MAX_RETRIES = 5;

export function buildWebSocketUrl(baseUrl: string, idSede: string, accessToken: string) {
  const base = baseUrl.replace(/\/$/, "").replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${base}/ws/alertas/${encodeURIComponent(idSede)}?token=${encodeURIComponent(accessToken)}`;
}

export function useWebSocket() {
  const { authenticated, usuario, accessToken } = useRole();
  const queryClient = useQueryClient();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const retryDelay = useRef(MIN_DELAY_MS);

  useEffect(() => {
    if (!authenticated || !usuario.id_sede || !accessToken) return;
    let stopped = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      const configuredBase = (import.meta.env.VITE_WS_URL as string | undefined)?.trim() || API_BASE_URL;
      socket = new WebSocket(buildWebSocketUrl(configuredBase, usuario.id_sede!, accessToken));

      socket.onopen = () => {
        retryCount.current = 0;
        retryDelay.current = MIN_DELAY_MS;
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            evento?: string;
            alerta?: { descripcion?: string };
          };
          if (message.evento !== "nueva_alerta") return;
          queryClient.invalidateQueries({ queryKey: ["dashboard-alertas"] });
          queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
          queryClient.invalidateQueries({ queryKey: ["alertas"] });
          toast.warning(message.alerta?.descripcion ?? "Nueva alerta de inventario");
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        if (stopped || retryCount.current >= MAX_RETRIES) return;
        retryCount.current += 1;
        const delay = retryDelay.current;
        retryDelay.current = Math.min(delay * 2, MAX_DELAY_MS);
        retryTimer.current = setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [accessToken, authenticated, queryClient, usuario.id_sede]);
}
