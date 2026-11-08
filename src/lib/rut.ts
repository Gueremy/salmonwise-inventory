export function normalizeSupplierRut(value: string): string | null {
  const compact = value.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(compact)) return null;
  const body = compact.slice(0, -1);
  if (Number(body) === 0) return null;
  const sum = [...body].reverse().reduce((total, digit, index) => total + Number(digit) * (2 + index % 6), 0);
  const remainder = 11 - sum % 11;
  const digit = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return compact.endsWith(digit) ? `${body}-${digit}` : null;
}
