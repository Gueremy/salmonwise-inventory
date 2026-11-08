import { toast as original } from "sonner";
import { evidenceEnabled } from "./evidence";

const safe = (message: unknown) => evidenceEnabled() ? "Aviso del sistema · detalle protegido" : message;
export const toast = {
  success: (message: string) => original.success(safe(message) as string),
  error: (message: string) => original.error(safe(message) as string),
  info: (message: string) => original.info(safe(message) as string),
};
