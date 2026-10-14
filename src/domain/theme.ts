import type { OrganizationThemeConfig } from "./organization";
import { DEFAULT_THEME } from "./organization";

function hexToHsl(value: string): string | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return null;
  const [red, green, blue] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case red: hue = ((green - blue) / delta) % 6; break;
      case green: hue = (blue - red) / delta + 2; break;
      default: hue = (red - green) / delta + 4;
    }
    hue = (hue * 60 + 360) % 360;
  }
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function applyOrganizationPalette(colors?: OrganizationThemeConfig) {
  const palette = colors ?? DEFAULT_THEME;
  for (const [key, cssName] of Object.entries({
    color_disponible: "--status-disponible",
    color_medio: "--status-medio",
    color_critico: "--status-critico",
    color_mantenimiento: "--status-mantenimiento",
    color_cuarentena: "--status-cuarentena",
  })) {
    const hsl = hexToHsl(palette[key as keyof OrganizationThemeConfig])
      ?? hexToHsl(DEFAULT_THEME[key as keyof OrganizationThemeConfig]);
    document.documentElement.style.setProperty(cssName, hsl!);
    const [hue, saturation] = hsl!.split(" ");
    document.documentElement.style.setProperty(`${cssName}-text`, `${hue} ${saturation} 25%`);
  }
}
