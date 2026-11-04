// Server-side only, like lib/geometry.ts: keeps the GeoJSON out of the client.
import { geoContains } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import oblasts from "@/data/ukraine-oblasts.json";
import type { LonLat } from "@/lib/projection";
import { isRegionId, type RegionId } from "@/lib/regions";

type RegionFeature = Feature<Polygon | MultiPolygon, { id: RegionId }>;

const features = (
  oblasts as FeatureCollection<Polygon | MultiPolygon, { id: string }>
).features
  .filter((f): f is RegionFeature => isRegionId(f.properties.id))
  // Kyiv city lies inside Kyiv oblast's outline, so it is checked first.
  .sort(
    (a, b) =>
      Number(b.properties.id === "kyiv-city") -
      Number(a.properties.id === "kyiv-city"),
  );

/** Region containing the point, or undefined for the sea and other countries. */
export const regionAt = ({ lon, lat }: LonLat): RegionId | undefined =>
  features.find((f) => geoContains(f, [lon, lat]))?.properties.id;
