import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

interface Props {
  nombreProveedor: string;
  setNombreProveedor: (val: string) => void;
  numGuiaDespacho: string;
  setNumGuiaDespacho: (val: string) => void;
  registroSanitario: string;
  setRegistroSanitario: (val: string) => void;
  temperaturaAlmacen: string;
  setTemperaturaAlmacen: (val: string) => void;
}

export const SernapescaFields = ({
  nombreProveedor,
  setNombreProveedor,
  numGuiaDespacho,
  setNumGuiaDespacho,
  registroSanitario,
  setRegistroSanitario,
  temperaturaAlmacen,
  setTemperaturaAlmacen,
}: Props) => {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <ShieldCheck className="h-4 w-4" />
        <span>Normativa Acuícola (SERNAPESCA)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <Label className="text-xs">Proveedor</Label>
          <Input
            value={nombreProveedor}
            onChange={(e) => setNombreProveedor(e.target.value)}
            placeholder="Skretting Chile Ltda."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">N° Guía Despacho</Label>
          <Input
            value={numGuiaDespacho}
            onChange={(e) => setNumGuiaDespacho(e.target.value)}
            placeholder="GD-12345"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Registro Sanitario</Label>
          <Input
            value={registroSanitario}
            onChange={(e) => setRegistroSanitario(e.target.value)}
            placeholder="REG-SAN-2026"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Temp. Almacén (°C)</Label>
          <Input
            type="number"
            value={temperaturaAlmacen}
            onChange={(e) => setTemperaturaAlmacen(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
