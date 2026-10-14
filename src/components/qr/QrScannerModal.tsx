import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Search, VideoOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeScanned: (code: string) => void;
}

export const QrScannerModal = ({ open, onOpenChange, onCodeScanned }: Props) => {
  const [manualCode, setManualCode] = useState("");
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualCode("");
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !hasCamera || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
    const DetectorClass = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!DetectorClass) {
      setCameraError("El escaneo automático no está disponible en este navegador. Usa el código manual.");
      return;
    }
    const detector = new DetectorClass({ formats: ["qr_code", "ean_13", "code_128"] });
    let active = true;
    const scan = async () => {
      if (!active) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            active = false;
            onCodeScanned(value);
            onOpenChange(false);
            return;
          }
        } catch {
          // Un fotograma sin código legible no cancela el escaneo.
        }
      }
      scanFrameRef.current = requestAnimationFrame(scan);
    };
    scanFrameRef.current = requestAnimationFrame(scan);
    return () => {
      active = false;
      if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    };
  }, [open, hasCamera, onCodeScanned, onOpenChange]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      setCameraError("La API de cámara no está disponible en este navegador o entorno.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setCameraError(null);
    } catch (err) {
      setHasCamera(false);
      setCameraError("Permiso de cámara denegado o dispositivo sin cámara disponible.");
    }
  };

  const stopCamera = () => {
    if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) {
      toast.error("Por favor ingresa un código para buscar");
      return;
    }

    onCodeScanned(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Escanear código QR / Barra
          </DialogTitle>
          <DialogDescription>
            Apunta la cámara al código de la ubicación o producto, o ingresa el identificador manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Visor de cámara o fallback */}
          <div className="h-52 w-full rounded-lg border border-border bg-black/90 relative overflow-hidden flex items-center justify-center">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border-2 border-primary/70 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                  <div className="w-full h-0.5 bg-primary/80" />
                </div>
                {cameraError && <p className="absolute bottom-1 left-2 right-2 text-xs text-white bg-black/70 p-1">{cameraError}</p>}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground space-y-2">
                <VideoOff className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-xs">{cameraError ?? "Cámara no disponible"}</p>
                <p className="text-[11px] text-muted-foreground/80">Puedes ingresar el código manualmente abajo.</p>
              </div>
            )}
          </div>

          {/* Formulario de ingreso manual */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs">Código manual (Ubicación o Ítem)</Label>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: G1-C01, U-102, LOTE-90"
                className="h-9 text-xs"
                autoFocus
              />
              <Button type="submit" size="sm" className="bg-primary hover:bg-secondary h-9">
                <Search className="h-3.5 w-3.5 mr-1" />
                Buscar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
