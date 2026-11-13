import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { evidenceEnabled, evidenceValue, setEvidenceEnabled, subscribeEvidence } from "./evidence";

export function useEvidenceMode() {
  const enabled = useSyncExternalStore(subscribeEvidence, evidenceEnabled, () => false);
  return { enabled, present: evidenceValue, setEnabled: setEvidenceEnabled };
}

export function SensitiveText({ value, category = "Dato" }: { value: unknown; category?: string }) {
  useEvidenceMode();
  return <>{evidenceValue(value, category)}</>;
}

export function EvidenceModeControl() {
  const { enabled, setEnabled } = useEvidenceMode();
  useEffect(() => { toast.dismiss(); }, [enabled]);
  // The toggle survives navigation but resets on page reload and account changes.
  return <div className="relative z-[100] border bg-background p-2 print:hidden md:fixed md:bottom-3 md:right-3 md:max-w-xs md:rounded-lg md:shadow-lg">
    <button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)} className="text-xs font-semibold p-1">
      {enabled ? "Modo evidencia activo · Mostrar datos" : "Proteger datos para capturas"}
    </button>
    {enabled && <p role="status" className="text-xs px-1">Datos protegidos en pantalla. La operación utiliza los valores reales.</p>}
  </div>;
}
