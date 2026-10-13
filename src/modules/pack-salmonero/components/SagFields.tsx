import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope } from "lucide-react";

interface Props {
  numRecetaRetenida: string;
  setNumRecetaRetenida: (val: string) => void;
  numAutorizacionSag: string;
  setNumAutorizacionSag: (val: string) => void;
}

export const SagFields = ({
  numRecetaRetenida,
  setNumRecetaRetenida,
  numAutorizacionSag,
  setNumAutorizacionSag,
}: Props) => {
  return (
    <div className="rounded-lg border border-status-medio/30 bg-status-medio/5 p-3.5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-status-medio">
        <Stethoscope className="h-4 w-4" />
        <span>Control Fármacos y Medicados (SAG)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <Label className="text-xs">N° Receta Retenida</Label>
          <Input
            value={numRecetaRetenida}
            onChange={(e) => setNumRecetaRetenida(e.target.value)}
            placeholder="REC-98765"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">N° Autorización SAG</Label>
          <Input
            value={numAutorizacionSag}
            onChange={(e) => setNumAutorizacionSag(e.target.value)}
            placeholder="SAG-AUTH-2026"
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
