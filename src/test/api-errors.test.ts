import { describe, it, expect } from "vitest";
import { ApiError, describeError } from "@/api/errors";
describe("mensajes de validación", () => {
  it("presenta campos de FastAPI sin convertir objetos a texto", () => {
    expect(describeError([{loc:["body","cantidad"],msg:"Debe ser positiva"}])).toBe("cantidad: Debe ser positiva");
  });
  it("distingue fallos reintentables de errores de negocio", () => {
    expect(new ApiError(503, "Ocupado").retryable).toBe(true);
    expect(new ApiError(422, []).retryable).toBe(false);
    expect(new ApiError(429, "Espera").retryable).toBe(true);
  });
});
