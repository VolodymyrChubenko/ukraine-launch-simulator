"use client";

import { createContext, useContext } from "react";
import type { GeoProjection } from "d3-geo";

export const MapProjectionContext = createContext<{
  projection: GeoProjection;
} | null>(null);

/** For layers rendered inside <UkraineMap>: lon/lat → SVG coordinates. */
export function useMapProjection() {
  const context = useContext(MapProjectionContext);
  if (!context) throw new Error("useMapProjection must be used inside <UkraineMap>");
  return context;
}
