// Shared by server (lib/geometry.ts) and client (components/UkraineMap.tsx),
// so both sides always use the same projection.
import { geoMercator, type GeoProjection } from "d3-geo";

export type LonLat = { lon: number; lat: number };

/** Fitted to the map on the server, then rebuilt on the client. */
export type ProjectionParams = { scale: number; translate: [number, number] };

/**
 * The projection type lives here only. To switch, e.g. to a conic one:
 * `geoConicConformal().parallels([45, 52]).rotate([-31, 0])`.
 * fitWidth/fitExtent only set scale and translate, so params stay valid.
 */
export const createBaseProjection = (): GeoProjection => geoMercator();

export const projectionFromParams = ({
  scale,
  translate,
}: ProjectionParams): GeoProjection =>
  createBaseProjection().scale(scale).translate(translate);
