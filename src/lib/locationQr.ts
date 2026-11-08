export function locationQrValue(id: string): string {
  return `salmotrack:location:${encodeURIComponent(id)}`;
}
export function parseLocationQr(raw: string): { id?: string; code?: string } {
  const value = raw.trim();
  if (value.startsWith("salmotrack:location:")) {
    try { return {id: decodeURIComponent(value.slice("salmotrack:location:".length))}; } catch { return {}; }
  }
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/locations\/([^/]+)\/?$/);
    if (match && ["https:", "http:"].includes(url.protocol)) return {id: decodeURIComponent(match[1])};
    // Legacy UUIDs are resolved only against authorized cached locations.
    if (url.protocol === "app-3d-salmonera:") return {id: url.searchParams.get("id") ?? undefined};
    return {};
  } catch { return {code: value}; }
}
