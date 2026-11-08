import { useEffect, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { prepareOffline, getOfflinePackage } from "@/offline/preparation";
import { Button } from "@/components/ui/button";
import { SensitiveText } from "@/privacy/EvidenceMode";

export function OfflinePreparation() {
  const { accessToken, organizacion, usuario, hasModule } = useRole();
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUntil(null);
    void getOfflinePackage(organizacion.id, usuario.id).then((data) => { if (active) setUntil(data.offline_until); }).catch(() => {});
    return () => { active = false; };
  }, [organizacion.id, usuario.id]);
  if (!hasModule("offline_sync")) return null;
  return <div className="rounded-md border p-3 text-xs space-y-2">
    <div>{until && Date.parse(until) > Date.now() ? `Listo sin conexión hasta ${new Date(until).toLocaleString("es-CL")}` : "Prepara tus datos antes de trabajar sin conexión."}</div>
    <Button size="sm" variant="outline" disabled={busy || !accessToken || !navigator.onLine} onClick={async () => {
      setBusy(true); setError(null);
      try {
        const result = await prepareOffline(accessToken!, organizacion.id, usuario.id);
        setUntil(result.data.offline_until);
        if (!result.persistent) setError("Datos descargados. El navegador no concedió almacenamiento persistente; conserva espacio libre y evita borrar los datos del sitio.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudieron guardar los datos en este dispositivo.");
      } finally { setBusy(false); }
    }}>{busy ? "Descargando datos autorizados..." : "Preparar dispositivo (72 h)"}</Button>
    {error && <p role="alert"><SensitiveText value={error} /></p>}
  </div>;
}
