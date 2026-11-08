import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { useRole } from "@/context/RoleContext";
import { offlineRead, type OfflinePackage } from "@/offline/preparation";
import { db } from "@/offline/db";
import type { MovementTypeConfig } from "@/domain/movement";

export function MovementStockPreview({ itemId, lotId, newLotNumber, locationIds, unit, types }: {
  itemId: string; lotId: string; newLotNumber?: string; locationIds: string[]; unit: string; types: MovementTypeConfig[];
}) {
  const { accessToken, organizacion, usuario } = useRole();
  const query = useQuery({
    queryKey: ["movement-stock-preview", accessToken, itemId, lotId, newLotNumber, ...locationIds],
    enabled: Boolean(accessToken && itemId), networkMode: "always", retry: false,
    queryFn: async () => {
      const balances = await offlineRead(organizacion.id, usuario.id,
        () => apiFetch<OfflinePackage["balances"]>("/api/v2/movimientos/saldos", {token:accessToken, params:{id_item:itemId}}), (data) => data.balances);
      const pending = await db.pendingMovements.where("organization_id").equals(organizacion.id)
        .and((row) => row.user_id === usuario.id && row.id_item === itemId &&
          (newLotNumber ? row.lote_nuevo?.numero_lote === newLotNumber : (row.id_lote ?? "") === lotId) &&
          (row.status === "pending" || row.status === "syncing" || row.server_state === "pendiente")).toArray();
      return [...new Set(locationIds.filter(Boolean))].map((id) => {
        const confirmed = newLotNumber ? 0 : balances.filter((balance) => balance.id_ubicacion === id && balance.id_item === itemId && (balance.id_lote ?? "") === lotId)
          .reduce((sum, row) => sum + Number(row.cantidad), 0);
        const provisional = pending.reduce((sum, row) => {
          const effect = types.find((type) => type.id === row.id_tipo_movimiento)?.efecto_stock;
          return sum + (row.id_ubicacion_destino === id && ["entrada", "traslado"].includes(effect ?? "") ? Number(row.cantidad) : 0)
            - (row.id_ubicacion_origen === id && ["salida", "traslado"].includes(effect ?? "") ? Number(row.cantidad) : 0);
        }, 0);
        return {id, confirmed, provisional};
      });
    },
  });
  if (!itemId) return null;
  return <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
    <p className="font-semibold">Saldo del producto y lote seleccionado</p>
    {query.isError ? <p>No hay saldo descargado disponible para esta selección.</p> : query.data?.map((row, index) =>
      <p key={row.id}>Ubicación {index + 1}: confirmado {row.confirmed} {unit} · pendiente {row.provisional > 0 ? "+" : ""}{row.provisional} {unit} · provisional {row.confirmed + row.provisional} {unit}</p>)}
    <p>El servidor valida nuevamente stock, capacidad y permisos al sincronizar o aprobar.</p>
  </div>;
}
