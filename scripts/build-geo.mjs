// Builds data/ukraine-oblasts.json from geoBoundaries gbHumanitarian
// (SSPE "Kartographia" via OCHA HDX, CC BY 3.0 IGO). Borders follow the
// coastline, unlike OSM-based sets that extend into territorial waters.
// Run: npm run geo:build
import { writeFile } from "node:fs/promises";
import { geoArea } from "d3-geo";
import mapshaper from "mapshaper";

const SOURCE_URL =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson";
const OUTPUT = "data/ukraine-oblasts.json";
// Max distance (metres) the simplified line may deviate from the source.
// At 1000px width 1px ≈ 1.3 km, so 600 m stays sharp even on retina screens.
const SIMPLIFY_INTERVAL = 600;
const EARTH_RADIUS_KM = 6371.0088;
// Ukraine is ≈ 603.6k km². Sea borders (territorial waters) push it to ≈ 640k.
const TOTAL_AREA_KM2 = [590_000, 610_000];

// shapeName → region id used across the app (and in persisted state).
// "Kyivska" is both the oblast and the city; see kyivId().
const NAME_TO_ID = {
  Vinnytska: "vinnytsia",
  Volynska: "volyn",
  Luhanska: "luhansk",
  Dnipropetrovska: "dnipropetrovsk",
  Donetska: "donetsk",
  Zhytomyrska: "zhytomyr",
  Zakarpatska: "zakarpattia",
  Zaporizka: "zaporizhia",
  "Ivano-Frankivska": "ivano-frankivsk",
  Kirovohradska: "kirovohrad",
  Lvivska: "lviv",
  Mykolaivska: "mykolaiv",
  Odeska: "odessa",
  Poltavska: "poltava",
  Rivnenska: "rivne",
  Sumska: "sumy",
  Ternopilska: "ternopil",
  Kharkivska: "kharkiv",
  Khersonska: "kherson",
  Khmelnytska: "khmelnytskyi",
  Cherkaska: "cherkasy",
  Chernivetska: "chernivtsi",
  Chernihivska: "chernihiv",
  "Avtonomna Respublika Krym": "crimea",
  Sevastopilska: "crimea", // Sevastopol is merged into Crimea
};
const REGION_COUNT = 26;

const polygonsOf = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

/** Spherical area of one polygon, regardless of its ring winding. */
function polygonArea(rings) {
  const area = geoArea({ type: "Polygon", coordinates: rings });
  return Math.min(area, 4 * Math.PI - area);
}

const areaKm2 = (geometry) =>
  polygonsOf(geometry).reduce((sum, rings) => sum + polygonArea(rings), 0) *
  EARTH_RADIUS_KM ** 2;

// Kyiv city is ≈ 840 km², Kyiv oblast ≈ 28,000 km².
const kyivId = (geometry) =>
  areaKm2(geometry) < 2_000 ? "kyiv-city" : "kyiv";

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const source = await response.json();

for (const feature of source.features) {
  const { shapeName } = feature.properties;
  const id =
    shapeName === "Kyivska" ? kyivId(feature.geometry) : NAME_TO_ID[shapeName];
  if (!id) throw new Error(`Unmapped region: ${shapeName}`);
  feature.properties = { id };
}

const output = await mapshaper.applyCommands(
  // Sub-pixel islands (incl. Zmiinyi, ≈0.2 km² ≈ 1/3 px) do not survive this.
  `-i source.json -dissolve id ` +
    `-filter-islands min-area=0.1km2 ` +
    `-simplify interval=${SIMPLIFY_INTERVAL} keep-shapes ` +
    `-o out.json format=geojson precision=0.0001`,
  { "source.json": source },
);
const result = JSON.parse(output["out.json"]);

const ids = new Set(result.features.map((f) => f.properties.id));
if (ids.size !== REGION_COUNT || result.features.length !== REGION_COUNT) {
  throw new Error(`Expected ${REGION_COUNT} regions, got ${[...ids].join(", ")}`);
}

// d3-geo expects exterior rings clockwise, the opposite of RFC 7946; otherwise
// a polygon covers the whole globe except itself. Winding is fixed per polygon,
// since the source mixes both directions even within one region.
for (const feature of result.features) {
  for (const rings of polygonsOf(feature.geometry)) {
    if (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI) {
      rings.forEach((ring) => ring.reverse());
    }
  }
  if (geoArea(feature) > 2 * Math.PI) {
    throw new Error(`Inverted polygon after rewind: ${feature.properties.id}`);
  }
}

const total = result.features.reduce((sum, f) => sum + areaKm2(f.geometry), 0);
if (total < TOTAL_AREA_KM2[0] || total > TOTAL_AREA_KM2[1]) {
  throw new Error(
    `Total area ${Math.round(total)} km² is out of range — borders may include the sea`,
  );
}

await writeFile(OUTPUT, JSON.stringify(result));
console.log(
  `Wrote ${OUTPUT}: ${REGION_COUNT} regions, ${Math.round(total).toLocaleString("en")} km²`,
);
