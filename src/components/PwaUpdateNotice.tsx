import { useEffect, useState } from "react";

export function PwaUpdateNotice() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const check = () => { void navigator.serviceWorker.getRegistration().then((registration) => {
      if (active) setWaiting(registration?.waiting ?? null);
    }); };
    const timer = setInterval(check, 15000);
    check();
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!waiting) return null;
  return <div className="fixed bottom-3 left-3 z-[100] rounded border bg-background p-3 text-xs max-w-xs">
    <p>Actualización disponible. Guarda tus formularios antes de actualizar; la cola local se conserva.</p>
    <button className="font-semibold underline mt-2" onClick={() => {
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    }}>Actualizar aplicación</button>
  </div>;
}
