import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QrScannerModal } from "@/components/qr/QrScannerModal";

const originalMediaDevices = navigator.mediaDevices;

afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: originalMediaDevices });
});

it("apaga una cámara que concede permiso después de cerrar el lector", async () => {
  let allowCamera!: (stream: MediaStream) => void;
  const pending = new Promise<MediaStream>((resolve) => { allowCamera = resolve; });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockReturnValue(pending) },
  });
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const onOpenChange = vi.fn();
  const onCodeScanned = vi.fn();
  const view = render(<QrScannerModal open onOpenChange={onOpenChange} onCodeScanned={onCodeScanned} />);
  view.rerender(<QrScannerModal open={false} onOpenChange={onOpenChange} onCodeScanned={onCodeScanned} />);
  allowCamera(stream);
  await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  expect(onCodeScanned).not.toHaveBeenCalled();
});
