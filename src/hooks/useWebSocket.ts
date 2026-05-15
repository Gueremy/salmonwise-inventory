import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

interface WsAlertaMessage {
  type: 'nueva_alerta';
  alerta: { mensaje: string };
}

function buildWsUrl(apiUrl: string, idSede: string, token: string): string {
  const wsBase = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase}/ws/alertas/${idSede}?token=${token}`;
}

const MIN_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function useWebSocket(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usuario = useAuthStore((s) => s.usuario);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef<number>(MIN_DELAY_MS);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    const idSede = usuario?.id_sede;

    if (!isAuthenticated || !idSede || !token) return;

    // WS needs absolute URL — proxy only works for HTTP, not WS
    const apiUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ??
      (import.meta.env.VITE_API_URL as string | undefined) ??
      'https://axious-backend.onrender.com';

    function connect(): void {
      if (unmountedRef.current) return;

      const url = buildWsUrl(apiUrl, idSede as string, token as string);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        delayRef.current = MIN_DELAY_MS;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsAlertaMessage;
          if (msg.type === 'nueva_alerta') {
            queryClient.invalidateQueries({ queryKey: ['alertas', 'activas'] });
            toast.warning(msg.alerta.mensaje);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        const delay = delayRef.current;
        delayRef.current = Math.min(delay * 2, MAX_DELAY_MS);
        retryRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (retryRef.current !== null) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, usuario?.id_sede, token, queryClient]);
}
