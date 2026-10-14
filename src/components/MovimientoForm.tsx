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
import { toast } from "sonner";
import { db } from "@/offline/db";
import { queueLocalMovement } from "@/offline/movementQueue";

interface LocationOption {
  id?: string;
  codigo?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: LocationOption;
  availableContainers?: LocationOption[];
  initialTipo?: string;
}

const preferredEffect: Record<string, MovementTypeConfig["efecto_stock"]> = {
  entrada_proveedor: "entrada",
  salida_produccion: "salida",
  traslado_interno: "traslado",
};

export const MovimientoForm = ({
  open, onOpenChange, container, availableContainers = [], initialTipo = "entrada_proveedor",
}: Props) => {
  const { accessToken, hasModule, online, usuario, organizacion } = useRole();
  const queryClient = useQueryClient();
  const [typeId, setTypeId] = useState("");
  const [itemId, setItemId] = useState("");
  const [lotId, setLotId] = useState("");
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
    queryKey: ["movement-types", accessToken],
    enabled: open && Boolean(accessToken),
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
      return db.movementTypes.where("id_organizacion").equals(organizacion.id).toArray();
    },
  });
  const itemsQuery = useQuery({
    queryKey: ["items", accessToken],
    enabled: open && Boolean(accessToken),
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
      return db.items.where("id_organizacion").equals(organizacion.id).toArray();
    },
  });
  const lotsQuery = useQuery({
    queryKey: ["lots", accessToken, itemId],
    enabled: open && Boolean(accessToken && itemId),
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
      return db.lots.where("id_item").equals(itemId).toArray();
    },
  });

  useEffect(() => {
    if (!open) return;
    setTypeId("");
    setItemId("");
    setLotId("");
    setOriginId(initialLocationId);
    setDestinationId("");
    setQuantity("");
    setNotes("");
    setSernapescaCode("");
    setSagAuthorization("");
    setExtraAttributes({});
    setError(null);
  }, [open, initialLocationId, initialTipo]);

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
      await queueLocalMovement({
        organizationId: organizacion.id, userId: usuario.id,
        id_tipo_movimiento: payload.id_tipo_movimiento, id_item: payload.id_item,
        id_lote: payload.id_lote, id_ubicacion_origen: payload.id_ubicacion_origen,
        id_ubicacion_destino: payload.id_ubicacion_destino, cantidad: payload.cantidad,
        unidad_medida: payload.unidad_medida, observaciones: payload.observaciones,
        atributos: payload.atributos,
      });
      toast.success("Movimiento guardado en este dispositivo; se sincronizará al recuperar conexión.");
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar el movimiento localmente.");
    }
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateMovementPayload) => createMovement(accessToken!, payload),
    onSuccess: (request) => {
      toast.success(request.estado === "aprobada" ? "Movimiento registrado y aplicado" : "Solicitud de movimiento registrada");
      for (const key of ["inventory-snapshot", "dashboard-kpis", "dashboard-pending-movements", "movimientos"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      onOpenChange(false);
    },
    onError: async (cause, payload) => {
      if (cause instanceof TypeError) {
        await queueMovement(payload);
      } else {
        setError(cause instanceof Error ? cause.message : "No se pudo registrar el movimiento");
      }
    },
  });

  const submit = () => {
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
    const attributes: Record<string, string> = { ...extraAttributes };
    if (packActive) {
      attributes.codigo_concesion_sernapesca = sernapescaCode.trim();
      attributes.autorizacion_sag = sagAuthorization.trim();
    }
    setError(null);
    const payload: CreateMovementPayload = {
      id_tipo_movimiento: type.id,
      id_item: item.id,
      id_lote: lotId || null,
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
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Los tipos, permisos y reglas provienen de tu organización.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(typesQuery.isError || itemsQuery.isError) && <p role="alert" className="text-destructive text-sm">No se pudieron cargar los catálogos. Revisa tu conexión o permisos.</p>}
          {!navigator.onLine && (!typesQuery.data?.length || !itemsQuery.data?.length) && <p role="alert" className="text-destructive text-sm">No hay catálogos guardados para crear este movimiento sin conexión.</p>}
          <div className="space-y-1">
            <Label>Tipo de movimiento</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>{typesQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}>{value.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {type?.requiere_origen && (
            <div className="space-y-1">
              <Label>Ubicación de origen</Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger><SelectValue placeholder="Selecciona origen" /></SelectTrigger>
                <SelectContent>{locations.map((value) => <SelectItem key={value.id} value={value.id!}>{value.codigo ?? value.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {type?.requiere_destino && (
            <div className="space-y-1">
              <Label>Ubicación de destino</Label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger><SelectValue placeholder="Selecciona destino" /></SelectTrigger>
              <SelectContent>{locations.filter((value) => !type.requiere_origen || value.id !== originId).map((value) => <SelectItem key={value.id} value={value.id!}>{value.codigo ?? value.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Ítem</Label>
            <Select value={itemId} onValueChange={(value) => { setItemId(value); setLotId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona ítem" /></SelectTrigger>
              <SelectContent>{itemsQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}>{value.nombre} ({value.codigo})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Lote (opcional)</Label>
            <Select value={lotId || "none"} onValueChange={(value) => setLotId(value === "none" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="Sin lote" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin lote</SelectItem>
                {lotsQuery.data?.map((value) => <SelectItem key={value.id} value={value.id}>{value.numero_lote}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Cantidad</Label><Input type="number" min="0.0001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
            <div className="space-y-1"><Label>Unidad</Label><Input readOnly value={item?.unidad_medida ?? ""} /></div>
          </div>
          {type?.campos_adicionales?.map((field) => (
            <div key={field.nombre} className="space-y-1">
              <Label>{field.label}</Label>
              <Input required={field.requerido} value={extraAttributes[field.nombre] ?? ""} onChange={(event) => setExtraAttributes((current) => ({ ...current, [field.nombre]: event.target.value }))} />
            </div>
          ))}
          {packActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Código concesión SERNAPESCA</Label><Input value={sernapescaCode} onChange={(event) => setSernapescaCode(event.target.value)} /></div>
              <div className="space-y-1"><Label>Autorización SAG</Label><Input value={sagAuthorization} onChange={(event) => setSagAuthorization(event.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1"><Label>Observaciones</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={mutation.isPending || typesQuery.isLoading || itemsQuery.isLoading}>Registrar</Button></div>
      </DialogContent>
    </Dialog>
  );
};
