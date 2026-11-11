/** Colores base de las escenas 3D. Los colores de estado vienen de la organización. */
export const SCENE_COLORS = {
  floor: "#1a1c2e",
  floorEdge: "#2d3250",
  highlight: "#38BDF8",
  focus: "#ffffff",
  hull: "#141627",
  deck: "#0b6aa3",
  slab: "#2d3250",
  frame: "#8b93b8",
  zoneBase: "#232640",
  labelText: "#ffffff",
  labelOutline: "rgba(10, 12, 24, 0.85)",
} as const;

/** Fondo del lienzo: respeta la variable del tema y cae al color histórico. */
export const SCENE_BACKGROUND = "hsl(var(--scene-bg, 222 47% 11%))";
