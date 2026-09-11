import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchContainerPublicInfo, type ContainerPublicInfo } from "@/lib/api";
import { parseContainerQr } from "@/lib/qr";

interface Props {
  onScan: (result: { id: string; info: ContainerPublicInfo }) => void;
  onClose: () => void;
}

export const QrScanner = ({ onScan, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const handledRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"requesting" | "scanning" | "loading" | "error">("requesting");
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    handledRef.current = false;
    setState("requesting");
    setError("");

    BrowserQRCodeReader.listVideoInputDevices()
      .then((devices) => {
        if (!devices.length || !videoRef.current) throw new Error("No se encontro una camara disponible.");
        setState("scanning");
        return reader.decodeFromVideoDevice(devices[0].deviceId, videoRef.current, async (result) => {
          if (!result || handledRef.current) return;
          handledRef.current = true;
          controlsRef.current?.stop();
          const id = parseContainerQr(result.getText());
          if (!id) {
            setError("El codigo no corresponde a un container AXIOUS.");
            setState("error");
            return;
          }

          setState("loading");
          try {
            const info = await fetchContainerPublicInfo(id);
            onScan({ id, info });
          } catch {
            setError("No se pudo consultar el container. Revisa la conexion e intenta nuevamente.");
            setState("error");
          }
        });
      })
      .then((controls) => {
        if (controls) controlsRef.current = controls;
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "No se pudo acceder a la camara.");
        setState("error");
      });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [attempt, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-black/90 px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-5 w-5" />Escanear container</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10" aria-label="Cerrar escaner">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {state === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-md border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
        )}
        {(state === "requesting" || state === "loading") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
            {state === "requesting" ? "Solicitando acceso a la camara..." : "Consultando container..."}
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-sm text-white">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />Reintentar
            </Button>
          </div>
        )}
      </div>
      <div className="bg-black/90 px-4 py-4 text-center text-xs text-white/70">Apunta la camara al QR del container</div>
    </div>
  );
};
