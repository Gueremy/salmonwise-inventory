import { normalizeSupplierRut } from "@/lib/rut";
import { MovementStockPreview } from "@/components/MovementStockPreview";
import { getOfflinePackage } from "@/offline/preparation";
import { SensitiveText } from "@/privacy/EvidenceMode";
import { ApiError } from "@/api/errors";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/context/RoleContext";
import { fetchItems, fetchLotsByItem } from "@/api/items";
import { createMovement, fetchMovementTypes } from "@/api/movements";
import type { CreateMovementPayload, MovementTypeConfig } from "@/domain/movement";
import { toast } from "@/privacy/notifications";
import { db } from "@/offline/db";
import { queueLocalMovement } from "@/offline/movementQueue";

interface LocationOption {
  id?: string;
  codigo?: string;
}

export interface Compensation {
  id: string; id_item: string; id_lote?: string | null; cantidad: number;
  id_ubicacion_origen?: string | null; id_ubicacion_destino?: string | null; efecto_stock: string;
}
interface Props {
  compensation?: Compensation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: LocationOption;
  availableContainers?: LocationOption[];
  initialTipo?: string;
}

const preferredEffect: Record<string, MovementTypeConfig["efecto_stock"]> = {
  entrada: "entrada", salida: "salida", traslado: "traslado",
  entrada_proveedor: "entrada",
  salida_produccion: "salida",
  traslado_interno: "traslado",
};

export const MovimientoForm = ({
  open, onOpenChange, container, availableContainers = [], initialTipo = "entrada_proveedor", compensation,
}: Props) => {
  const { accessToken, hasModule, online, usuario, organizacion } = useRole();
  const queryClient = useQueryClient();
  const [typeId, setTypeId] = useState("");
  const [itemId, setItemId] = useState("");
  const [lotId, setLotId] = useState("");
  const [newLot, setNewLot] = useState(false);
  const [lotNumber, setLotNumber] = useState("");
  const [manufactured, setManufactured] = useState("");
  const [expires, setExpires] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierRut, setSupplierRut] = useState("");
  const [savingLocal, setSavingLocal] = useState(false);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [sernapescaCode, setSernapescaCode] = useState("");
  const [sagAuthorization, setSagAuthorization] = useState("");
  const [extraAttributes, setExtraAttributes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const initialLocationId = container?.id ?? availableContainers[0]?.id ?? "";

  const typesQuery = useQuery({
    queryKey: ["movement-types", accessToken, organizacion.id],
    enabled: open && Boolean(accessToken),
    networkMode: "always",
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const types = await fetchMovementTypes(accessToken!);
          await db.movementTypes.bulkPut(types);
          return types;
        } catch (cause) {
          if (!(cause instanceof TypeError)) throw cause;
        }
      }
      return (await getOfflinePackage(organizacion.id, usuario.id)).movement_types;
    },
  });
  const itemsQuery = useQuery({
    queryKey: ["items", accessToken, organizacion.id],
    enabled: open && Boolean(accessToken),
    networkMode: "always",
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const items = await fetchItems(accessToken!);
          await db.items.bulkPut(items);
          return items;
        } catch (cause) {
          if (!(cause instanceof TypeError)) throw cause;
        }
      }
      return (await getOfflinePackage(organizacion.id, usuario.id)).items;
    },
  });
  const lotsQuery = useQuery({
    queryKey: ["lots", accessToken, organizacion.id, itemId],
    enabled: open && Boolean(accessToken && itemId),
    networkMode: "always",
    queryFn: async () => {
      if (navigator.onLine) {
        try {
          const lots = await fetchLotsByItem(accessToken!, itemId);
          await db.lots.bulkPut(lots);
          return lots;
        } catch (cause) {
          if (!(cause instanceof TypeError)) throw cause;
        }
      }
      return (await getOfflinePackage(organizacion.id, usuario.id)).lots.filter((lot) => lot.id_item === itemId);
    },
  });

  useEffect(() => {
    if (!open) return;
    setTypeId("");
    setItemId(compensation?.id_item ?? "");
    setLotId(compensation?.id_lote ?? "");
    setNewLot(false); setLotNumber(""); setManufactured(""); setExpires(""); setSupplierName(""); setSupplierRut("");
    setOriginId(compensation?.id_ubicacion_destino ?? initialLocationId);
    setDestinationId(compensation?.id_ubicacion_origen ?? "");
    setQuantity(compensation ? String(compensation.cantidad) : "");
    setNotes("");
    setSernapescaCode("");
    setSagAuthorization("");
    setExtraAttributes({});
    setError(null);
  }, [open, initialLocationId, initialTipo, compensation]);

  useEffect(() => {
    if (!open || typeId || !typesQuery.data?.length) return;
    const preferred = preferredEffect[initialTipo];
    const selected = typesQuery.data.find((type) =>
      type.id === initialTipo || type.codigo === initialTipo || type.efecto_stock === preferred,
    ) ?? typesQuery.data[0];
    setTypeId(selected.id);
  }, [open, typeId, initialTipo, typesQuery.data]);

  const type = typesQuery.data?.find((value) => value.id === typeId);
  const item = itemsQuery.data?.find((value) => value.id === itemId);
  const packActive = hasModule("pack_salmonero");
  const locations = [...availableContainers, ...(container ? [container] : [])]
    .filter((value, index, all) => value.id && all.findIndex((candidate) => candidate.id === value.id) === index);

  useEffect(() => {
    if (open && type?.requiere_destino && !type.requiere_origen && container?.id && !destinationId) {
      setDestinationId(container.id);
    }
  }, [open, type, container?.id, destinationId]);

  const queueMovement = async (payload: CreateMovementPayload) => {
    if (!hasModule("offline_sync")) {
      setError("Este módulo no permite registrar movimientos sin conexión.");
      return;
    }
    try {
      setSavingLocal(true);
      await getOfflinePackage(organizacion.id, usuario.id, true);
      await queueLocalMovement({
        uuid_local: payload.uuid_local,
        id_movimiento_original: payload.id_movimiento_original,
        lote_nuevo: payload.lote_nuevo, fecha_hora_local: payload.fecha_hora_local,
        organizationId: organizacion.id, userId: usuario.id,
        id_tipo_movimiento: payload.id_tipo_movimiento, id_item: payload.id_item,
        id_lote: payload.id_lote, id_ubicacion_origen: payload.id_ubicacion_origen,
        id_ubicacion_destino: payload.id_ubicacion_destino, cantidad: payload.cantidad,
        unidad_medida: payload.unidad_medida, observaciones: payload.observaciones,
        atributos: payload.atributos,
      });
      toast.success("Movimiento guardado en este dispositivo; se sincronizará al recuperar conexión.");
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el movimiento localmente. Prepara el dispositivo y revisa el espacio disponible.");
    } finally { setSavingLocal(false); }
  };

  const mutation = useMutation({
    mutationFn: async (payload: CreateMovementPayload) => {
      // Persist before the first HTTP attempt: a lost response must reuse the same UUID.
      await queueLocalMovement({ ...payload, organizationId: organizacion.id, userId: usuario.id });
      const request = await createMovement(accessToken!, payload);
      await db.pendingMovements.update(payload.uuid_local!, {
        status: "synced", id_movimiento_servidor: request.id,
        server_state: request.fecha_resolucion ? "sincronizado" : "pendiente",
      });
      return request;
    },
    onSuccess: (request) => {
      toast.success(request.estado === "aprobada" ? "Movimiento registrado y aplicado" : "Solicitud de movimiento registrada");
      for (const key of ["inventory-snapshot", "dashboard-kpis", "dashboard-pending-movements", "movimientos"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      onOpenChange(false);
    },
    onError: async (cause, payload) => {
      if (cause instanceof TypeError || (cause instanceof ApiError && cause.retryable)) {
        await queueMovement(payload);
      } else {
        if (payload.uuid_local) await db.pendingMovements.update(payload.uuid_local, {
          status: "rejected", last_error: cause instanceof Error ? cause.message : "Operación rechazada",
        });
        setError(cause instanceof Error ? cause.message : "No se pudo registrar el movimiento");
      }
    },
  });

  const submit = () => {
    if (savingLocal || mutation.isPending) return;
    if (compensation && (!online || !navigator.onLine)) { setError("Las correcciones requieren conexión y permiso de ajuste."); return; }
    if (newLot && type?.efecto_stock === "entrada" && (!lotNumber.trim() || !supplierName.trim() || !supplierRut.trim())) {
      setError("Completa el lote nuevo, RUT y razón social del proveedor."); return;
    }
    if (newLot && type?.efecto_stock === "entrada" && !normalizeSupplierRut(supplierRut)) {
      setError("Revisa el RUT del proveedor: el dígito verificador no coincide."); return;
    }
    if (newLot && manufactured && expires && manufactured > expires) {
      setError("La fabricación debe ser anterior al vencimiento."); return;
    }
    if (!accessToken || !type || !item) {
      setError("Selecciona un tipo de movimiento y un ítem.");
      return;
    }
    if (type.requiere_origen && !originId || type.requiere_destino && !destinationId) {
      setError("Selecciona las ubicaciones requeridas para este movimiento.");
      return;
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (packActive && (!sernapescaCode.trim() || !sagAuthorization.trim())) {
      setError("Completa los identificadores SERNAPESCA y SAG del pack activo.");
      return;
    }
    if (type.campos_adicionales?.some((field) => field.requerido && !extraAttributes[field.nombre]?.trim())) {
      setError("Completa los atributos requeridos para este tipo de movimiento.");
      return;
    }
    const attributes: Record<string, unknown> = { ...extraAttributes };
    if (packActive) {
      attributes.codigo_concesion_sernapesca = sernapescaCode.trim();
      attributes.autorizacion_sag = sagAuthorization.trim();
    }
    setError(null);
    const payload: CreateMovementPayload = {
      id_movimiento_original: compensation?.id,
      uuid_local: crypto.randomUUID(),
      fecha_hora_local: new Date().toISOString(),
      ...(newLot && type.efecto_stock === "entrada" ? { lote_nuevo: {
        numero_lote: lotNumber.trim(), proveedor: { rut: normalizeSupplierRut(supplierRut)!, razon_social: supplierName.trim() },
        fecha_fabricacion: manufactured ? new Date(manufactured).toISOString() : null,
        fecha_vencimiento: expires ? new Date(expires).toISOString() : null,
      }} : {}),
      id_tipo_movimiento: type.id,
      id_item: item.id,
      id_lote: newLot && type.efecto_stock === "entrada" ? null : lotId || null,
      id_ubicacion_origen: type.requiere_origen ? originId : null,
      id_ubicacion_destino: type.requiere_destino ? destinationId : null,
      cantidad: Number(quantity),
      unidad_medida: item.unidad_medida,
      observaciones: notes.trim() || null,
      atributos: attributes,
    };
    if (!online || !navigator.onLine) {
      void queueMovement(payload);
    } else {
      mutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{compensation ? "Movimiento compensatorio" : "Registrar movimiento"}</DialogTitle>
          <DialogDescription>Los tipos, permisos y reglas provienen de tu organización.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(typesQuery.isError || itemsQuery.isError) && <p role="alert" className="text-destructive text-sm">No se pudieron cargar los catálogos. Revisa tu conexión o permisos.</p>}
          {!navigator.onLine && (!typesQuery.data?.length || !itemsQuery.data?.length) && <p role="alert" className="text-destructive text-sm">No hay catálogos guardados para crear este movimiento sin conexión.</p>}
          <div className="space-y-1">
            <Label htmlFor="movement-type">Tipo de movimiento</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger id="movement-type"><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>{typesQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}>{value.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {type?.requiere_origen && (
            <div className="space-y-1">
                <Label htmlFor="movement-origin">Ubicación de origen</Label>
              <Select disabled={Boolean(compensation)} value={originId} onValueChange={setOriginId}>
                <SelectTrigger id="movement-origin"><SelectValue placeholder="Selecciona origen" /></SelectTrigger>
                <SelectContent>{locations.map((value) => <SelectItem key={value.id} value={value.id!}>{value.codigo ?? value.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {type?.requiere_destino && (
            <div className="space-y-1">
                <Label htmlFor="movement-destination">Ubicación de destino</Label>
              <Select disabled={Boolean(compensation)} value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger id="movement-destination"><SelectValue placeholder="Selecciona destino" /></SelectTrigger>
              <SelectContent>{locations.filter((value) => !type.requiere_origen || value.id !== originId).map((value) => <SelectItem key={value.id} value={value.id!}>{value.codigo ?? value.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="movement-item">Ítem</Label>
            <Select disabled={Boolean(compensation)} value={itemId} onValueChange={(value) => { setItemId(value); setLotId(""); }}>
              <SelectTrigger id="movement-item"><SelectValue placeholder="Selecciona ítem" /></SelectTrigger>
              <SelectContent>{itemsQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}><SensitiveText category="Dato" value={value.nombre} /> ({value.codigo})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="movement-lot">Lote (opcional)</Label>
            <Select disabled={Boolean(compensation)} value={lotId || "none"} onValueChange={(value) => setLotId(value === "none" ? "" : value)}>
              <SelectTrigger id="movement-lot"><SelectValue placeholder="Sin lote" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin lote</SelectItem>
                {lotsQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}>{value.numero_lote}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="movement-quantity">Cantidad</Label><Input id="movement-quantity" readOnly={Boolean(compensation)} type="number" min="0.0001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="movement-unit">Unidad</Label><Input id="movement-unit" readOnly value={item?.unidad_medida ?? ""} /></div>
          </div>
          <MovementStockPreview itemId={itemId} lotId={lotId} newLotNumber={newLot ? lotNumber : undefined} locationIds={[originId, destinationId]} unit={item?.unidad_medida ?? ""} types={typesQuery.data ?? []} />
          {type?.campos_adicionales?.map((field) => (
            <div key={field.nombre} className="space-y-1">
              <Label htmlFor={`movement-extra-${field.nombre}`}>{field.label}</Label>
              <Input id={`movement-extra-${field.nombre}`} required={field.requerido} value={extraAttributes[field.nombre] ?? ""} onChange={(event) => setExtraAttributes((current) => ({ ...current, [field.nombre]: event.target.value }))} />
            </div>
          ))}
          {!compensation && type?.efecto_stock === "entrada" && <div className="space-y-2 border rounded p-3">
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={newLot} onChange={(e) => setNewLot(e.target.checked)} />Recibir un lote nuevo</label>
            {newLot && <>
              <Label htmlFor="new-lot-number">Número de lote</Label><Input id="new-lot-number" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
              <Label htmlFor="supplier-name">Razón social del proveedor</Label><Input id="supplier-name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
              <Label htmlFor="supplier-rut">RUT del proveedor</Label><Input id="supplier-rut" value={supplierRut} onChange={(e) => setSupplierRut(e.target.value)} placeholder="76123456-0" />
              <Label htmlFor="lot-manufactured">Fabricación</Label><Input id="lot-manufactured" type="date" value={manufactured} onChange={(e) => setManufactured(e.target.value)} />
              <Label htmlFor="lot-expires">Vencimiento</Label><Input id="lot-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </>}
          </div>}
          {packActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="movement-sernapesca">Código concesión SERNAPESCA</Label><Input id="movement-sernapesca" value={sernapescaCode} onChange={(event) => setSernapescaCode(event.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="movement-sag">Autorización SAG</Label><Input id="movement-sag" value={sagAuthorization} onChange={(event) => setSagAuthorization(event.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1"><Label htmlFor="movement-notes">Observaciones</Label><Textarea id="movement-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive"><SensitiveText category="Dato" value={error} /></p>}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={savingLocal || mutation.isPending || typesQuery.isLoading || itemsQuery.isLoading}>Registrar</Button></div>
      </DialogContent>
    </Dialog>
  );
};
