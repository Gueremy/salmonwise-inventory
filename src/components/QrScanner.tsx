import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import type { ContainerPublicInfo } from "@/types";

interface Props {
  onScan: (info: ContainerPublicInfo) => void;
  onClose: () => void;
}

type ScanState = 'requesting' | 'scanning' | 'loading' | 'error';

export const QrScanner = ({ onScan, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [state, setState] = useState<ScanState>('requesting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    BrowserQRCodeReader.listVideoInputDevices()
      .then((devices) => {
        if (!devices.length) {
          setState('error');
          setErrorMsg('No se encontró cámara en este dispositivo.');
          return;
        }
        const deviceId = devices[0].deviceId;
        setState('scanning');

        return reader.decodeFromVideoDevice(deviceId, videoRef.current!, async (result, err) => {
          if (result) {
            const text = result.getText();
            setState('loading');
            controlsRef.current?.stop();
            try {
              const { data } = await apiClient.get<ContainerPublicInfo>(`/containers/${text}/info-publica`);
              onScan(data);
            } catch {
              setState('error');
              setErrorMsg('No se reconoció el código QR. Intenta de nuevo.');
            }
          }
          if (err && !(err instanceof TypeError)) {
            // Silently ignore scan attempt errors
          }
        }).then((controls) => {
          controlsRef.current = controls as { stop: () => void };
        });
      })
      .catch(() => {
        setState('error');
        setErrorMsg('Necesitamos acceso a la cámara para escanear códigos QR.');
      });

    return () => {
      controlsRef.current?.stop();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera className="h-5 w-5" />
          <span className="font-semibold text-sm">Escanear código QR</span>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-white min-w-[56px] min-h-[56px] hover:bg-white/10"
          aria-label="Cerrar escáner"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {state === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-white rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          </div>
        )}
        {state === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-sm text-center px-6">
              Necesitamos acceso a la cámara para escanear códigos QR.
            </p>
          </div>
        )}
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-sm">Leyendo container...</p>
          </div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <p className="text-white text-sm text-center">{errorMsg}</p>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => { setState('scanning'); }}
            >
              Reintentar
            </Button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 bg-black/80">
        <p className="text-white/70 text-xs text-center">
          Apunta la cámara al código QR del container
        </p>
      </div>
    </div>
  );
};
