// Builds data/frontline.json: a snapshot of the front from DeepStateMap
// (deepstatemap.live), for reference on the map only — the simulator's rules
// work on whole regions (OCCUPIED_REGIONS in lib/regions.ts).
// - areas: occupied since 2022, occupied before 2022 and unknown-status zones,
//   clipped to Ukraine's borders;
// - line: the boundary between controlled and all other territory (no
//   state border or coastline).
// Run after geo:build: npm run geo:frontline
import { readFile, writeFile } from "node:fs/promises";
import { geoArea } from "d3-geo";
import mapshaper from "mapshaper";

const SOURCE_URL = "https://deepstatemap.live/api/history/last";
const OBLASTS = "data/ukraine-oblasts.json";
const OUTPUT = "data/frontline.json";
// The status tag is the last part of `properties.name`, e.g.
// "Окуповано /// Occupied /// geoJSON.status.occupied".
const LAYER_BY_TAG = {
  "geoJSON.status.occupied": "occupied",
  "geoJSON.territories.ordlo": "occupied2014",
  "geoJSON.territories.crimea": "occupied2014",
  "geoJSON.territories.tuzla": "occupied2014",
  "geoJSON.status.unknown": "unknown",
};
const SIMPLIFY_INTERVAL = 500;

const polygonsOf = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

/** DeepState coordinates carry altitude: [lon, lat, 0]. */
const dropAltitude = (coords) =>
  typeof coords[0] === "number" ? coords.slice(0, 2) : coords.map(dropAltitude);

/** d3-geo expects clockwise exterior rings; see build-geo.mjs. */
function rewind(collection) {
  for (const feature of collection.features) {
    for (const rings of polygonsOf(feature.geometry)) {
      if (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI) {
        rings.forEach((ring) => ring.reverse());
      }
    }
  }
}

const response = await fetch(SOURCE_URL, {
  headers: { "User-Agent": "Mozilla/5.0 (map frontline snapshot)" },
});
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const snapshot = await response.json();

const features = snapshot.map.features.flatMap((feature) => {
  const { type } = feature.geometry;
  if (type !== "Polygon" && type !== "MultiPolygon") return [];
  const tag = feature.properties.name?.match(/geoJSON\.[\w.]+/)?.[0];
  const layer = LAYER_BY_TAG[tag];
  if (!layer) return [];
  return [
    {
      type: "Feature",
      properties: { layer },
      geometry: { type, coordinates: dropAltitude(feature.geometry.coordinates) },
    },
  ];
});
const oblasts = JSON.parse(await readFile(OBLASTS, "utf8"));

// One dataset for both inputs, so erase and innerlines share arcs.
const output = await mapshaper.applyCommands(
  `-i areas.json oblasts.json combine-files ` +
    `-dissolve layer target=areas ` +
    `-clip oblasts target=areas ` +
    `-simplify interval=${SIMPLIFY_INTERVAL} keep-shapes target=areas ` +
    `-dissolve target=oblasts + name=ukraine ` +
    `-erase areas target=ukraine + name=controlled ` +
    `-dissolve target=areas + name=uncontrolled ` +
    `-merge-layers target=controlled,uncontrolled force name=both ` +
    `-innerlines target=both + name=line ` +
    `-o areas-out.json format=geojson precision=0.0001 target=areas ` +
    `-o line-out.json format=geojson precision=0.0001 target=line`,
  { "areas.json": { type: "FeatureCollection", features }, "oblasts.json": oblasts },
);
const areas = JSON.parse(output["areas-out.json"]);
areas.features = areas.features.filter((f) => f.geometry);
rewind(areas);
/** A GeometryCollection of LineStrings. */
const line = JSON.parse(output["line-out.json"]);

const updatedAt = new Date(snapshot.id * 1000).toISOString();
await writeFile(OUTPUT, JSON.stringify({ updatedAt, areas, line }));

const count = (layer) => features.filter((f) => f.properties.layer === layer).length;
console.log(
  `Wrote ${OUTPUT}: snapshot ${updatedAt} (${snapshot.datetime}); ` +
    `polygons: occupied ${count("occupied")}, occupied2014 ${count("occupied2014")}, ` +
    `unknown ${count("unknown")}; front line: ${line.geometries.length} segments`,
);
