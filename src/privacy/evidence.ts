// Presentation only. Never use these aliases in business state or HTTP payloads.
let enabled = false;
const listeners = new Set<() => void>();
const aliases = new Map<string, string>();
export const evidenceEnabled = () => enabled;
export function setEvidenceEnabled(value: boolean) {
  enabled = value;
  if (!value) aliases.clear();
  listeners.forEach((listener) => listener());
}
export function subscribeEvidence(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function evidenceValue(value: unknown, category = "Dato"): string {
  if (value === null || value === undefined) return "—";
  const original = String(value);
  if (!enabled || !original || original === "—") return original;
  if (category === "RUT" || /\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/.test(original)) return "RUT protegido";
  const key = `${category}:${original}`;
  if (!aliases.has(key)) {
    const count = [...aliases.keys()].filter((item) => item.startsWith(`${category}:`)).length + 1;
    aliases.set(key, `${category} ${String(count).padStart(2, "0")}`);
  }
  return aliases.get(key)!;
}
