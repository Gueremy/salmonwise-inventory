import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import type { InventoryContainerView } from "@/lib/inventory";
import { useRole } from "@/context/RoleContext";
import { createMovimiento, fetchProductos, type CreateMovimientoPayload } from "@/lib/api";
import { fetchMovementTypes } from "@/api/movements";
import { SernapescaFields, SagFields } from "@/modules/pack-salmonero";
import { toast } from "sonner";

export interface MovimientoContainerOption {
  id: string;
  codigo: string;
  capacidadMax?: number;
  capacidad_maxima?: number;
  ocupacionActual?: number;
  ocupacion_actual?: number;
  producto?: string | null;
  lote?: string | null;
  tipoProductoPermitido?: string;
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  container?: InventoryContainerView | MovimientoContainerOption;
  availableContainers?: (InventoryContainerView | MovimientoContainerOption)[];
  initialTipo?: string;
}

const defaultTypeIcons: Record<string, typeof ArrowDownToLine> = {
  entrada_proveedor: ArrowDownToLine,
  salida_produccion: ArrowUpFromLine,
  traslado_interno: RefreshCw,
};

function formatDateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function toIsoDate(dateValue: string) {
  return `${dateValue}T00:00:00`;
}

export const MovimientoForm = ({
  open,
  onOpenChange,
  container,
  availableContainers = [],
  initialTipo = "entrada_proveedor",
}: Props) => {
  const { usuario, accessToken, hasModule } = useRole();
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<string>(initialTipo);
  const [productoId, setProductoId] = useState("");
  const [containerOrigenId, setContainerOrigenId] = useState(container?.id ?? availableContainers[0]?.id ?? "");
  const [containerDestinoId, setContainerDestinoId] = useState("");
  const [cantidad, setCantidad] = useState("100");
  const [numeroLote, setNumeroLote] = useState("");
  const [fechaFabricacion, setFechaFabricacion] = useState(formatDateInput(-30));
  const [fechaVencimiento, setFechaVencimiento] = useState(formatDateInput(180));
  const [nombreProveedor, setNombreProveedor] = useState("Skretting Chile Ltda.");
  const [numGuiaDespacho, setNumGuiaDespacho] = useState("");
  const [registroSanitario, setRegistroSanitario] = useState("");
  const [temperaturaAlmacen, setTemperaturaAlmacen] = useState("4");
  const [numRecetaRetenida, setNumRecetaRetenida] = useState("");
  const [numAutorizacionSag, setNumAutorizacionSag] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ["movement-types", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => fetchMovementTypes(accessToken!),
  });

  const productsQuery = useQuery({
    queryKey: ["productos", accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => {
      const response = await fetchProductos(accessToken!);
      return response.items;
    },
  });

  const movementTypes = typesQuery.data ?? [
    { id: "entrada_proveedor", codigo: "ENT", nombre: "Entrada de Proveedor", requiere_origen: false, requiere_destino: true, requiere_aprobacion: true },
    { id: "salida_produccion", codigo: "SAL", nombre: "Salida a Producción", requiere_origen: true, requiere_destino: false, requiere_aprobacion: false },
    { id: "traslado_interno", codigo: "TRAS", nombre: "Traslado Interno", requiere_origen: true, requiere_destino: true, requiere_aprobacion: false },
  ];

  const currentTypeConfig = movementTypes.find((t) => t.id === tipo) ?? movementTypes[0];

  const selectedProduct = productsQuery.data?.find((item) => item.id === productoId) ?? null;
  const isPackSalmoneroActive = hasModule("pack_salmonero");
  const showSernapesca = isPackSalmoneroActive && tipo === "entrada_proveedor";
  const showSAG = isPackSalmoneroActive && tipo === "entrada_proveedor" && selectedProduct?.categoria === "veterinario";
  const isOperario = usuario.rol === "operario";

  const destinationOptions = useMemo(
    () => availableContainers.filter((item) => item.id !== containerOrigenId),
    [availableContainers, containerOrigenId],
  );

  useEffect(() => {
    if (!open) return;

    const defaultOriginId = container?.id ?? availableContainers[0]?.id ?? "";
    setTipo(initialTipo);
    setProductoId("");
    setContainerOrigenId(defaultOriginId);
    setContainerDestinoId("");
    setCantidad("100");
    setNumeroLote("");
    setFechaFabricacion(formatDateInput(-30));
    setFechaVencimiento(formatDateInput(180));
    setNombreProveedor("Skretting Chile Ltda.");
    setNumGuiaDespacho("");
    setRegistroSanitario("");
    setTemperaturaAlmacen("4");
    setNumRecetaRetenida("");
    setNumAutorizacionSag("");
    setObservaciones("");
    setError(null);
  }, [open, container?.id, availableContainers, initialTipo]);

  const originContainer = availableContainers.find((item) => item.id === containerOrigenId) ?? container;

  const createMutation = useMutation({
    mutationFn: ({ accessToken: token, payload }: { accessToken: string; payload: CreateMovimientoPayload }) =>
      createMovimiento(token, payload),
    onSuccess: (data) => {
      toast.success(
        data.estado === "aprobado"
          ? "Movimiento registrado y aplicado"
          : "Movimiento registrado en estado pendiente de aprobacion",
      );
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-galpones"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-pending-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alertas"] });
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "No se pudo registrar el movimiento");
    },
  });

  const handleSubmit = () => {
    if (!accessToken) {
      setError("No hay sesión activa.");
      return false;
    }

    if (!productoId) {
      setError("Selecciona un producto o ítem.");
      return false;
    }

    if (!containerOrigenId) {
      setError("Selecciona una ubicación de origen.");
      return false;
    }

    if (!numeroLote.trim()) {
      setError("Ingresa el número de lote.");
      return false;
    }

    if (!fechaVencimiento) {
      setError("Ingresa la fecha de vencimiento.");
      return false;
    }

    if (showSernapesca) {
      if (!fechaFabricacion || !nombreProveedor.trim() || !numGuiaDespacho.trim() || !registroSanitario.trim()) {
        setError("Completa todos los campos requeridos por SERNAPESCA.");
        return false;
      }
    }

    if (currentTypeConfig?.requiere_destino && !containerDestinoId) {
      setError("Selecciona la ubicación de destino.");
      return false;
    }

    if (showSAG && (!numRecetaRetenida.trim() || !numAutorizacionSag.trim())) {
      setError("Completa los campos SAG para productos veterinarios.");
      return false;
    }

    setError(null);
    return true;
  };

  const submitRealMovement = () => {
    if (!accessToken || !productoId || !containerOrigenId) return;

    createMutation.mutate({
      accessToken,
      payload: {
        id_container: containerOrigenId,
        id_producto: productoId,
        tipo: tipo as CreateMovimientoPayload["tipo"],
        cantidad: Number(cantidad),
        numeroLote,
        fecha_fabricacion: showSernapesca && fechaFabricacion ? toIsoDate(fechaFabricacion) : undefined,
        fecha_vencimiento: toIsoDate(fechaVencimiento),
        nombre_proveedor: showSernapesca ? nombreProveedor : undefined,
        num_guia_despacho: showSernapesca ? numGuiaDespacho : undefined,
        registro_sanitario: showSernapesca ? registroSanitario : undefined,
        temperatura_almacen: showSernapesca && temperaturaAlmacen ? Number(temperaturaAlmacen) : undefined,
        num_receta_retenida: showSAG ? numRecetaRetenida : undefined,
        num_autorizacion_sag: showSAG ? numAutorizacionSag : undefined,
        id_container_destino: currentTypeConfig?.requiere_destino ? containerDestinoId : undefined,
        observaciones: observaciones || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento de inventario</DialogTitle>
          <DialogDescription>
            {isOperario
              ? "El movimiento quedara pendiente de aprobacion por jefatura."
              : "Formulario configurable conectado al motor de reglas del backend."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selector dinámico de tipos de movimiento */}
          <div className="grid grid-cols-3 gap-2">
            {movementTypes.map((t) => {
              const Icon = defaultTypeIcons[t.id] ?? ArrowDownToLine;
              const isSelected = tipo === t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1.5" />
                  <div>
                    <div className="text-xs font-semibold leading-tight text-foreground">{t.nombre}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.codigo}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ubicación origen *</Label>
              <Select value={containerOrigenId} onValueChange={setContainerOrigenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  {availableContainers.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.codigo} · {item.producto ?? item.tipoProductoPermitido ?? "Disponible"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentTypeConfig?.requiere_destino && (
              <div className="space-y-2">
                <Label>Ubicación destino *</Label>
                <Select value={containerDestinoId} onValueChange={setContainerDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} · {item.ocupacion ?? 0}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Ítem / Producto *</Label>
              <Select value={productoId} onValueChange={setProductoId}>
                <SelectTrigger>
                  <SelectValue placeholder={productsQuery.isLoading ? "Cargando ítems..." : "Selecciona ítem"} />
                </SelectTrigger>
                <SelectContent>
                  {productsQuery.data?.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.nombre} · {prod.codigo_barras} ({prod.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Número de lote *</Label>
              <Input
                value={numeroLote}
                onChange={(event) => setNumeroLote(event.target.value)}
                placeholder="LOTE-2026-X"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de vencimiento *</Label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(event) => setFechaVencimiento(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidad de medida</Label>
              <div className="h-10 rounded-md border border-border px-3 flex items-center text-sm text-muted-foreground bg-muted/20">
                {selectedProduct?.unidad_medida ?? originContainer?.unidadMedida ?? "unidades"}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Observaciones</Label>
              <Textarea
                rows={2}
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Observaciones operativas (opcional)"
              />
            </div>
          </div>

          {/* Bloque modular SERNAPESCA (solo si módulo pack_salmonero está activo) */}
          {showSernapesca && (
            <SernapescaFields
              nombreProveedor={nombreProveedor}
              setNombreProveedor={setNombreProveedor}
              numGuiaDespacho={numGuiaDespacho}
              setNumGuiaDespacho={setNumGuiaDespacho}
              registroSanitario={registroSanitario}
              setRegistroSanitario={setRegistroSanitario}
              temperaturaAlmacen={temperaturaAlmacen}
              setTemperaturaAlmacen={setTemperaturaAlmacen}
            />
          )}

          {/* Bloque modular SAG (solo si módulo pack_salmonero está activo y es veterinario) */}
          {showSAG && (
            <SagFields
              numRecetaRetenida={numRecetaRetenida}
              setNumRecetaRetenida={setNumRecetaRetenida}
              numAutorizacionSag={numAutorizacionSag}
              setNumAutorizacionSag={setNumAutorizacionSag}
            />
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-primary hover:bg-secondary"
            disabled={createMutation.isPending || productsQuery.isLoading}
            onClick={() => {
              if (handleSubmit()) {
                submitRealMovement();
              }
            }}
          >
            {createMutation.isPending ? "Registrando..." : "Registrar movimiento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
