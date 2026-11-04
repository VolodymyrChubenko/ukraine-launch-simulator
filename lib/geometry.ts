// Server-side only: builds SVG paths from GeoJSON so d3-geo and the
// GeoJSON never reach the client bundle. Import types only from client code.
import { geoBounds, geoPath, type GeoPath } from "d3-geo";
import type {
  FeatureCollection,
  GeometryCollection,
  MultiPoint,
  MultiPolygon,
  Polygon,
} from "geojson";
import frontline from "@/data/frontline.json";
import neighborCapitals from "@/data/neighbor-capitals.json";
import neighborBorders from "@/data/neighbor-regions.json";
import neighbors from "@/data/neighbors.json";
import oblasts from "@/data/ukraine-oblasts.json";
import type { FrontlineLayer } from "./frontline";
import {
  createBaseProjection,
  projectionFromParams,
  type ProjectionParams,
} from "./projection";
import {
  CAPITALS,
  REGION_NAMES,
  isRegionId,
  type Capital,
  type RegionId,
} from "./regions";

const WIDTH = 1000;
/**
 * How much of the surroundings is shown on each side of Ukraine: long-range
 * targets lie to the north and east; west and south only keep the border clear.
 */
const SURROUNDINGS_KM = { north: 450, east: 450, south: 25, west: 10 };
const KM_PER_DEGREE = 111.2;
/**
 * Countries drawn with regions and regional centres (data from
 * scripts/build-neighbors.mjs); all others only get their name.
 */
const DETAILED_COUNTRIES = new Set(["RUS", "BLR"]);
/** Countries whose visible part is smaller than this (SVG units²) stay unnamed. */
const MIN_LABELLED_AREA = 4000;

export type MapRegion = {
  id: RegionId;
  name: string;
  path: string;
  capital?: Pick<Capital, "name" | "anchor"> & { x: number; y: number };
};

export type MapNeighbor = { name: string; path: string };

export type MapPlace = { name: string; x: number; y: number };

type TextAnchor = "start" | "middle" | "end";

/** Rough label width in SVG units: names are placed on the server, unmeasured. */
const textWidth = (text: string, fontSize: number, emPerChar: number) =>
  text.length * fontSize * emPerChar;
const COUNTRY_LABEL = { fontSize: 12, emPerChar: 0.75 }; // caps, wide tracking
const CAPITAL_LABEL = { fontSize: 9, emPerChar: 0.6 };
const NATIONAL_CAPITAL_LABEL = { fontSize: 11, emPerChar: 0.62 };
const EDGE_MARGIN = 4;

export type UkraineMapData = {
  viewBox: string;
  regions: MapRegion[];
  /** Countries around Ukraine: background only, not interactive. */
  neighbors: MapNeighbor[];
  /** One path: borders between regions of DETAILED_COUNTRIES. */
  neighborBorders: string;
  /** Regional centres of DETAILED_COUNTRIES; `capital` marks national ones. */
  neighborCapitals: (MapPlace & { capital: boolean; anchor: TextAnchor })[];
  /** Names of the other countries, at the centre of their visible part. */
  countryLabels: MapPlace[];
  /** DeepStateMap snapshot (scripts/build-frontline.mjs), for reference only. */
  frontline: Record<FrontlineLayer, string> & { line: string; updatedAt: string };
  /** Lets the client convert between lon/lat and map coordinates. */
  projection: ProjectionParams;
};

export function buildUkraineMap(): UkraineMapData {
  const collection = oblasts as FeatureCollection<
    Polygon | MultiPolygon,
    { id: string }
  >;
  const extent = surroundingsOf(collection);
  const projection = createBaseProjection().fitWidth(WIDTH, extent);
  const toPath = geoPath(projection).digits(1);

  const regions = collection.features.map((feature): MapRegion => {
    const { id } = feature.properties;
    if (!isRegionId(id)) throw new Error(`Unknown region id: ${id}`);

    const capital = CAPITALS[id];
    const point = capital && projection([capital.lon, capital.lat]);

    return {
      id,
      name: REGION_NAMES[id],
      path: toPath(feature) ?? "",
      capital: capital && point
        ? {
            name: capital.name,
            anchor: capital.anchor,
            x: round(point[0]),
            y: round(point[1]),
          }
        : undefined,
    };
  });

  // Kyiv city is drawn last so it sits on top of Kyiv oblast and stays clickable.
  regions.sort(
    (a, b) => Number(a.id === "kyiv-city") - Number(b.id === "kyiv-city"),
  );

  const [[x0, y0], [x1, y1]] = toPath.bounds(extent);
  const viewBox = [x0, y0, x1 - x0, y1 - y0].map(round).join(" ");
  const inView = ([x, y]: [number, number]) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;

  const countries = (
    neighbors as FeatureCollection<
      Polygon | MultiPolygon,
      { name: string; adm0: string }
    >
  ).features;

  const neighborRegions = countries.map(
    (feature): MapNeighbor => ({
      name: feature.properties.name,
      path: toPath(feature) ?? "",
    }),
  );

  // Same projection, clipped to the view: area and centroid of what is visible.
  const toVisiblePath = geoPath(
    projectionFromParams({
      scale: projection.scale(),
      translate: projection.translate(),
    }).clipExtent([
      [x0, y0],
      [x1, y1],
    ]),
  );
  const countryLabels = countries
    .filter(
      (feature) =>
        !DETAILED_COUNTRIES.has(feature.properties.adm0) &&
        toVisiblePath.area(feature) >= MIN_LABELLED_AREA,
    )
    .map((feature): MapPlace => {
      const { name } = feature.properties;
      const [cx, cy] = toVisiblePath.centroid(feature);
      // A narrow visible strip puts the centroid at the edge: keep it all in view.
      const half =
        textWidth(name, COUNTRY_LABEL.fontSize, COUNTRY_LABEL.emPerChar) / 2 +
        EDGE_MARGIN;
      const x = Math.min(Math.max(cx, x0 + half), x1 - half);
      const y = Math.min(
        Math.max(cy, y0 + COUNTRY_LABEL.fontSize),
        y1 - COUNTRY_LABEL.fontSize,
      );
      return { name, x: round(x), y: round(y) };
    });

  const capitals = neighborCapitals.flatMap(({ name, lon, lat, capital }) => {
    const point = projection([lon, lat]);
    if (!point || !inView(point)) return [];
    const [x, y] = point;
    const { fontSize, emPerChar } = capital ? NATIONAL_CAPITAL_LABEL : CAPITAL_LABEL;
    const half = textWidth(name, fontSize, emPerChar) / 2 + EDGE_MARGIN;
    // Near the left/right edge the label grows inwards instead of centred.
    const anchor: TextAnchor =
      x - half < x0 ? "start" : x + half > x1 ? "end" : "middle";
    return [{ name, capital, anchor, x: round(x), y: round(y) }];
  });

  const [tx, ty] = projection.translate();
  return {
    viewBox,
    regions,
    neighbors: neighborRegions,
    neighborBorders: toPath(neighborBorders as GeometryCollection) ?? "",
    neighborCapitals: capitals,
    countryLabels,
    frontline: buildFrontline(toPath),
    projection: { scale: projection.scale(), translate: [tx, ty] },
  };
}

function buildFrontline(toPath: GeoPath): UkraineMapData["frontline"] {
  const areas = frontline.areas as FeatureCollection<
    Polygon | MultiPolygon,
    { layer: FrontlineLayer }
  >;
  const pathOf = (layer: FrontlineLayer) =>
    toPath({
      type: "FeatureCollection",
      features: areas.features.filter((f) => f.properties.layer === layer),
    }) ?? "";
  return {
    occupied: pathOf("occupied"),
    occupied2014: pathOf("occupied2014"),
    unknown: pathOf("unknown"),
    line: toPath(frontline.line as GeometryCollection) ?? "",
    updatedAt: frontline.updatedAt,
  };
}

/** Corners of Ukraine's bounding box pushed out by SURROUNDINGS_KM. */
function surroundingsOf(collection: FeatureCollection): MultiPoint {
  const [[west, south], [east, north]] = geoBounds(collection);
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  const dLat = (km: number) => km / KM_PER_DEGREE;
  const dLon = (km: number) => km / (KM_PER_DEGREE * Math.cos(midLat));
  return {
    type: "MultiPoint",
    coordinates: [
      [west - dLon(SURROUNDINGS_KM.west), south - dLat(SURROUNDINGS_KM.south)],
      [east + dLon(SURROUNDINGS_KM.east), north + dLat(SURROUNDINGS_KM.north)],
    ],
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
