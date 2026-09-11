import { CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePendingCount } from "@/hooks/useSync";

export const SyncStatus = () => {
  const online = useOnlineStatus();
  const pending = usePendingCount();

  if (!online) {
    return <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><WifiOff className="h-3.5 w-3.5" />Sin conexion</span>;
  }
  if (pending > 0) {
    return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700"><Wifi className="h-3.5 w-3.5" />{pending} pendiente{pending === 1 ? "" : "s"}</span>;
  }
  return <span className="flex items-center gap-1.5 text-xs font-medium text-status-disponible"><CheckCircle2 className="h-3.5 w-3.5" />Sincronizado</span>;
};
