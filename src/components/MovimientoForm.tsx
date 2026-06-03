import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import type { InventoryContainerView } from "@/lib/inventory";
import { useRole } from "@/context/RoleContext";
import { createMovimiento, fetchProductos } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  container?: InventoryContainerView;
  availableContainers?: InventoryContainerView[];
  initialTipo?: Tipo;
}

type Tipo = "entrada_proveedor" | "salida_produccion" | "traslado_interno";

const tipos: { id: Tipo; label: string; icon: typeof ArrowDownToLine; desc: string }[] = [
  { id: "entrada_proveedor", label: "Entrada de Proveedor", icon: ArrowDownToLine, desc: "Recepcion de insumo externo" },
  { id: "salida_produccion", label: "Salida a Produccion", icon: ArrowUpFromLine, desc: "Despacho a planta o ponton" },
  { id: "traslado_interno", label: "Traslado Interno", icon: RefreshCw, desc: "Movimiento entre containers" },
];

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
  const { usuario, accessToken } = useRole();
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>(initialTipo);
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

  const productsQuery = useQuery({
    queryKey: ["productos", accessToken],
    enabled: Boolean(accessToken),
    retry: false,
    queryFn: async () => {
      const response = await fetchProductos(accessToken!);
      return response.items;
    },
  });

  const selectedProduct = productsQuery.data?.find((item) => item.id === productoId) ?? null;
  const showSernapesca = tipo === "entrada_proveedor";
  const showSAG = tipo === "entrada_proveedor" && selectedProduct?.categoria === "veterinario";
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
  }, [availableContainers, container, initialTipo, open]);

  const createMutation = useMutation({
    mutationFn: ({ accessToken: token, payload }: { accessToken: string; payload: Parameters<typeof createMovimiento>[1] }) =>
      createMovimiento(token, payload),
    onSuccess: (data) => {
      const statusMessage = data.estado === "aprobado" ? "Movimiento registrado y aprobado" : "Movimiento registrado y enviado a flujo";
      toast.success(statusMessage);
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
      setError("No hay sesion activa.");
      return false;
    }

    if (!productoId) {
      setError("Selecciona un producto.");
      return false;
    }

    if (!containerOrigenId) {
      setError("Selecciona un container origen.");
      return false;
    }

    if (!numeroLote.trim()) {
      setError("Ingresa el numero de lote.");
      return false;
    }

    if (!fechaVencimiento) {
      setError("Ingresa la fecha de vencimiento.");
      return false;
    }

    if (showSernapesca) {
      if (!fechaFabricacion || !nombreProveedor.trim() || !numGuiaDespacho.trim() || !registroSanitario.trim()) {
        setError("Completa todos los campos SERNAPESCA.");
        return false;
      }
    }

    if (tipo === "traslado_interno" && !containerDestinoId) {
      setError("Selecciona el container destino.");
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
        tipo,
        cantidad: Number(cantidad),
        numero_lote: numeroLote.trim(),
        fecha_vencimiento: toIsoDate(fechaVencimiento),
        fecha_fabricacion: showSernapesca ? toIsoDate(fechaFabricacion) : undefined,
        nombre_proveedor: showSernapesca ? nombreProveedor.trim() : undefined,
        num_guia_despacho: showSernapesca ? numGuiaDespacho.trim() : undefined,
        registro_sanitario: showSernapesca ? registroSanitario.trim() : undefined,
        temperatura_almacen: showSernapesca ? Number(temperaturaAlmacen) : undefined,
        num_receta_retenida: showSAG ? numRecetaRetenida.trim() : undefined,
        num_autorizacion_sag: showSAG ? numAutorizacionSag.trim() : undefined,
        id_container_destino: tipo === "traslado_interno" ? containerDestinoId : undefined,
        observaciones: observaciones.trim() || undefined,
      },
    });
  };

  const originContainer = availableContainers.find((item) => item.id === containerOrigenId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            El formulario ahora registra movimientos reales contra FastAPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Tipo de movimiento</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tipos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTipo(item.id)}
                  className={`text-left p-3 rounded-md border-2 transition ${
                    tipo === item.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <item.icon className={`h-5 w-5 mb-1.5 ${tipo === item.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={productoId} onValueChange={setProductoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {productsQuery.data?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.nombre} · {product.categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Container origen</Label>
              {container ? (
                <div className="h-10 rounded-md border border-border px-3 flex items-center text-sm">
                  {container.codigo}
                </div>
              ) : (
                <Select value={containerOrigenId} onValueChange={setContainerOrigenId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona container" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableContainers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} · {item.ocupacion}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {tipo === "traslado_interno" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Container destino</Label>
                <Select value={containerDestinoId} onValueChange={setContainerDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {destinationOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.codigo} · {item.ocupacion}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Numero de lote</Label>
              <Input value={numeroLote} onChange={(event) => setNumeroLote(event.target.value)} placeholder="LOT-2026-..." />
            </div>

            <div className="space-y-2">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={fechaVencimiento} onChange={(event) => setFechaVencimiento(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Unidad referencial</Label>
              <div className="h-10 rounded-md border border-border px-3 flex items-center text-sm text-muted-foreground">
                {selectedProduct?.unidad_medida ?? originContainer?.codigo ?? "Se define por producto/container"}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Observaciones</Label>
              <Textarea rows={2} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Opcional" />
            </div>
          </div>

          {showSernapesca && (
            <div className="rounded-md border border-secondary/30 bg-secondary/5 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-secondary font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" /> Datos SERNAPESCA
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Fecha de fabricacion *" type="date" value={fechaFabricacion} onChange={setFechaFabricacion} />
                <Field label="Nombre del proveedor *" value={nombreProveedor} onChange={setNombreProveedor} />
                <Field label="N° guia de despacho *" value={numGuiaDespacho} onChange={setNumGuiaDespacho} />
                <Field label="Temperatura almacen *" value={temperaturaAlmacen} onChange={setTemperaturaAlmacen} placeholder="°C" />
                <Field label="Registro sanitario *" value={registroSanitario} onChange={setRegistroSanitario} className="sm:col-span-2" />
              </div>
            </div>
          )}

          {showSAG && (
            <div className="rounded-md border border-status-cuarentena/30 bg-status-cuarentena/5 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-status-cuarentena font-semibold text-sm">
                <Stethoscope className="h-4 w-4" /> Datos SAG
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="N° receta retenida *" value={numRecetaRetenida} onChange={setNumRecetaRetenida} />
                <Field label="N° autorizacion SAG *" value={numAutorizacionSag} onChange={setNumAutorizacionSag} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-primary hover:bg-secondary"
            disabled={createMutation.isPending || productsQuery.isLoading}
            onClick={() => {
              if (handleSubmit()) {
                submitRealMovement();
              }
            }}
          >
            {createMutation.isPending ? "Registrando..." : isOperario ? "Registrar movimiento" : "Registrar movimiento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  type = "text",
  placeholder,
  className = "",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-xs">{label}</Label>
    <Input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);
