// Builds the surroundings of the map from Natural Earth (public domain),
// clipped to the map extent:
// - data/neighbors.json: countries around Ukraine. Ukraine's own oblasts are
//   erased from it, so no neighbour overlaps them (incl. Crimea).
// - data/neighbor-regions.json: borders between the regions of DETAILED
//   countries (inner lines only: country borders come from neighbors.json).
// - data/neighbor-capitals.json: regional centres and capitals of DETAILED.
// Anything Natural Earth places inside Ukraine's borders is dropped.
// Run after geo:build: npm run geo:neighbors
import { readFile, writeFile } from "node:fs/promises";
import { geoArea, geoBounds, geoCentroid, geoContains } from "d3-geo";
import mapshaper from "mapshaper";

const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson";
const COUNTRIES_URL = `${NE_URL}/ne_50m_admin_0_countries.geojson`;
const REGIONS_URL = `${NE_URL}/ne_10m_admin_1_states_provinces.geojson`;
// The full file: only it has Ukrainian names (NAME_UK).
const PLACES_URL = `${NE_URL}/ne_10m_populated_places.geojson`;
const OBLASTS = "data/ukraine-oblasts.json";
const OUTPUT = {
  countries: "data/neighbors.json",
  regions: "data/neighbor-regions.json",
  capitals: "data/neighbor-capitals.json",
};
/** Countries shown with their regions and regional centres. */
const DETAILED = ["RUS", "BLR"];
const CAPITAL_CLASSES = new Set(["Admin-0 capital", "Admin-1 capital"]);
// The map shows ~500 km around Ukraine (lib/geometry.ts); clip a bit wider
// so no country edge ends inside the visible area.
const CLIP_PADDING_KM = 800;
const KM_PER_DEGREE = 111.2;
// At ≈ 2 km per px, 1 km deviation is invisible.
const SIMPLIFY_INTERVAL = 1000;

const polygonsOf = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.json();
}

const oblasts = JSON.parse(await readFile(OBLASTS, "utf8"));
const inUkraine = (point) => oblasts.features.some((f) => geoContains(f, point));

const [[west, south], [east, north]] = geoBounds(oblasts);
const dLat = CLIP_PADDING_KM / KM_PER_DEGREE;
const dLon =
  CLIP_PADDING_KM /
  (KM_PER_DEGREE * Math.cos((((south + north) / 2) * Math.PI) / 180));
const clip = [west - dLon, south - dLat, east + dLon, north + dLat];
const bbox = clip.map((n) => n.toFixed(2)).join(",");
const inClip = ([lon, lat]) =>
  lon >= clip[0] && lon <= clip[2] && lat >= clip[1] && lat <= clip[3];

const [countriesSource, regionsSource, placesSource] = await Promise.all(
  [COUNTRIES_URL, REGIONS_URL, PLACES_URL].map(download),
);

// --- Countries -------------------------------------------------------------

const countriesOut = await mapshaper.applyCommands(
  `-i source.json -i oblasts.json ` +
    `-filter 'ADM0_A3 != "UKR"' target=source ` +
    `-each 'name = NAME_UK || NAME, adm0 = ADM0_A3' target=source ` +
    `-filter-fields name,adm0 target=source ` +
    `-clip bbox=${bbox} target=source ` +
    `-erase oblasts target=source ` +
    `-filter-islands min-area=50km2 target=source ` +
    `-simplify interval=${SIMPLIFY_INTERVAL} keep-shapes target=source ` +
    `-o out.json format=geojson precision=0.001 target=source`,
  { "source.json": countriesSource, "oblasts.json": oblasts },
);
const countries = JSON.parse(countriesOut["out.json"]);
countries.features = countries.features.filter((f) => f.geometry);

// d3-geo expects clockwise exterior rings; see build-geo.mjs.
for (const feature of countries.features) {
  for (const rings of polygonsOf(feature.geometry)) {
    if (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI) {
      rings.forEach((ring) => ring.reverse());
    }
  }
}

// --- Regions of DETAILED countries ------------------------------------------

// Natural Earth assigns Crimea and Sevastopol to Russia; drop such regions
// before mapshaper, so not even coastline slivers of them are left.
regionsSource.features = regionsSource.features.filter(
  (f) =>
    DETAILED.includes(f.properties.adm0_a3) && !inUkraine(geoCentroid(f)),
);

const regionsOut = await mapshaper.applyCommands(
  `-i source.json -i oblasts.json ` +
    `-filter-fields name target=source ` +
    `-clip bbox=${bbox} target=source ` +
    `-erase oblasts target=source ` +
    `-simplify interval=${SIMPLIFY_INTERVAL} keep-shapes target=source ` +
    `-innerlines target=source ` +
    `-o out.json format=geojson precision=0.001 target=source`,
  { "source.json": regionsSource, "oblasts.json": oblasts },
);
/** A GeometryCollection of LineStrings. */
const regions = JSON.parse(regionsOut["out.json"]);

// --- Regional centres and capitals of DETAILED countries --------------------

const capitals = placesSource.features
  .filter(({ properties: p, geometry: g }) =>
    DETAILED.includes(p.ADM0_A3) &&
    CAPITAL_CLASSES.has(p.FEATURECLA) &&
    inClip(g.coordinates) &&
    !inUkraine(g.coordinates),
  )
  .map(({ properties: p, geometry: g }) => ({
    name: p.NAME_UK || p.NAME,
    lon: Math.round(g.coordinates[0] * 1e4) / 1e4,
    lat: Math.round(g.coordinates[1] * 1e4) / 1e4,
    capital: p.FEATURECLA === "Admin-0 capital",
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "uk"));

await Promise.all([
  writeFile(OUTPUT.countries, JSON.stringify(countries)),
  writeFile(OUTPUT.regions, JSON.stringify(regions)),
  writeFile(OUTPUT.capitals, JSON.stringify(capitals)),
]);
console.log(
  `Wrote ${OUTPUT.countries}: ${countries.features.length} countries\n` +
    `Wrote ${OUTPUT.regions}: ${regions.geometries.length} border lines\n` +
    `Wrote ${OUTPUT.capitals}: ${capitals.map((c) => c.name).join(", ")}`,
);
