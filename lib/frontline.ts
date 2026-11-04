// Shared by lib/geometry.ts (server) and UkraineMap (client); keep it free of
// data imports so the GeoJSON stays on the server.

/** Drawing order: older occupation below, unknown-status zones on top. */
export const FRONTLINE_LAYERS = ["occupied2014", "occupied", "unknown"] as const;
export type FrontlineLayer = (typeof FRONTLINE_LAYERS)[number];

/** DeepStateMap's colours, drawn at 30% like on their map. */
export const FRONTLINE_FILL: Record<FrontlineLayer, string> = {
  occupied: "#a52714",
  occupied2014: "#880e4f",
  unknown: "#bcaaa4",
};
