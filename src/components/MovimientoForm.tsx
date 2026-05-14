import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react";
import { Container, containers as allContainers } from "@/data/mock";
import { useRole } from "@/context/RoleContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  container?: Container;
}

type Tipo = "entrada_proveedor" | "salida_produccion" | "traslado_interno";

const tipos: { id: Tipo; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "entrada_proveedor", label: "Entrada de Proveedor", icon: ArrowDownToLine, desc: "Recepción de insumo externo" },
  { id: "salida_produccion", label: "Salida a Producción", icon: ArrowUpFromLine, desc: "Despacho a planta o pontón" },
  { id: "traslado_interno", label: "Traslado Interno", icon: RefreshCw, desc: "Movimiento entre containers" },
];

export const MovimientoForm = ({ open, onOpenChange, container }: Props) => {
  const { usuario } = useRole();
  const [tipo, setTipo] = useState<Tipo>("entrada_proveedor");
  const [producto, setProducto] = useState("");
  const [containerDest, setContainerDest] = useState(container?.codigo ?? "");
  const [esVeterinario, setEsVeterinario] = useState(false);

  useEffect(() => {
    if (container) setContainerDest(container.codigo);
  }, [container]);

  const showSernapesca = tipo === "entrada_proveedor";
  const showSAG = esVeterinario;
  const isOperario = usuario.rol === "operario";

  const handleSubmit = () => {
    toast.success(isOperario ? "Movimiento enviado para aprobación" : "Movimiento registrado y aprobado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Completa los campos. Los requisitos SERNAPESCA y SAG aparecen según el tipo y producto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipo */}
          <div>
            <Label className="mb-2 block">Tipo de movimiento</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tipos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`text-left p-3 rounded-md border-2 transition ${
                    tipo === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <t.icon className={`h-5 w-5 mb-1.5 ${tipo === t.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={producto} onValueChange={(v) => { setProducto(v); setEsVeterinario(v.includes("Vitamina") || v.includes("Antibiótico")); }}>
                <SelectTrigger><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alimento Skretting 5mm">Alimento Skretting 5mm</SelectItem>
                  <SelectItem value="Alimento 3mm">Alimento 3mm</SelectItem>
                  <SelectItem value="Alimento 8mm">Alimento 8mm</SelectItem>
                  <SelectItem value="Vitamina C Plus">Vitamina C Plus (veterinario)</SelectItem>
                  <SelectItem value="Antibiótico XYZ">Antibiótico XYZ (veterinario)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Container destino</Label>
              <Select value={containerDest} onValueChange={setContainerDest}>
                <SelectTrigger><SelectValue placeholder="Selecciona container" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {allContainers.slice(0, 12).map((c) => (
                    <SelectItem key={c.id} value={c.codigo}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ({ disponible: "#22C55E", medio: "#EAB308", critico: "#EF4444", mantenimiento: "#9CA3AF", cuarentena: "#8B5CF6" } as any)[c.estado] }} />
                        {c.codigo} · {c.ocupacion}%
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select defaultValue="kg">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                  <SelectItem value="lt">Litros (lt)</SelectItem>
                  <SelectItem value="un">Unidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observaciones</Label>
              <Textarea rows={2} placeholder="Opcional" />
            </div>
          </div>

          {/* SERNAPESCA */}
          {showSernapesca && (
            <div className="rounded-md border border-secondary/30 bg-secondary/5 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-secondary font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" /> Datos SERNAPESCA (obligatorios para entrada de proveedor)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Número de lote *" />
                <Field label="Fecha de fabricación *" type="date" />
                <Field label="Fecha de vencimiento *" type="date" />
                <Field label="Nombre del proveedor *" />
                <Field label="N° guía de despacho *" />
                <Field label="Temperatura almacén *" placeholder="°C" />
                <Field label="Registro sanitario *" className="sm:col-span-2" />
              </div>
            </div>
          )}

          {/* SAG */}
          {showSAG && (
            <div className="rounded-md border border-status-cuarentena/30 bg-status-cuarentena/5 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-status-cuarentena font-semibold text-sm">
                <Stethoscope className="h-4 w-4" /> Datos SAG (producto veterinario)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="N° receta retenida *" />
                <Field label="N° autorización SAG *" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-primary hover:bg-secondary" onClick={handleSubmit}>
            {isOperario ? "Enviar para aprobación" : "Registrar y aprobar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FieldProps { label: string; type?: string; placeholder?: string; className?: string; }
const Field = ({ label, type = 'text', placeholder, className = '' }: FieldProps) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-xs">{label}</Label>
    <Input type={type} placeholder={placeholder} />
  </div>
);
