export class ApiError extends Error {
  constructor(public status: number, public detail: unknown, public requestId?: string | null) {
    super(describeError(detail)); this.name = "ApiError";
  }
  get retryable() { return this.status >= 500 || this.status === 429 || this.status === 408; }
}
export function describeError(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) return detail.map((item) => {
    const field = Array.isArray(item?.loc) ? item.loc.filter((part: unknown) => part !== "body").join(" · ") : "";
    return `${field ? `${field}: ` : ""}${typeof item?.msg === "string" ? item.msg : "Revisa el valor ingresado"}`;
  }).join("; ");
  if (detail && typeof detail === "object" && "message" in detail) return describeError(detail.message);
  return "No se pudo completar la solicitud. Revisa los datos e inténtalo nuevamente.";
}
