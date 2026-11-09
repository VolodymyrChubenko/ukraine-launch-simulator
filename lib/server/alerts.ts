// Server-side only: the API token must never reach the client bundle.
import "server-only";
import type { AlertLevel, AlertLevels, AlertSnapshot } from "@/lib/alerts";
import { REGION_NAMES, type RegionId } from "@/lib/regions";

const ACTIVE_ALERTS_URL = "https://api.alerts.in.ua/v1/alerts/active.json";
const TIMEOUT_MS = 8_000;
/** Two upstream requests a minute at most: the API blocks IPs above 12. */
const CACHE_MS = 30_000;

type ActiveAlert = {
  alert_type: string;
  alert_level: AlertLevel;
  location_oblast: string;
};

/**
 * Matched by name: despite its name, location_oblast_uid holds the raion's or
 * hromada's own uid on local alerts. Sevastopol is drawn as part of Crimea.
 */
const REGION_BY_NAME = new Map<string, RegionId>([
  ...Object.entries(REGION_NAMES).map(
    ([id, name]) => [name, id as RegionId] as const,
  ),
  ["м. Севастополь", "crimea"],
]);

/** A region takes its highest level, even if the alert covers only a part of it. */
function toLevels(alerts: ActiveAlert[]): AlertLevels {
  const levels: AlertLevels = {};
  for (const alert of alerts) {
    const region = REGION_BY_NAME.get(alert.location_oblast);
    if (alert.alert_type !== "air_raid" || !region) continue;
    if (levels[region] !== "red") levels[region] = alert.alert_level;
  }
  return levels;
}

/** Null on any failure. Logs never include the token or the raw error. */
async function fetchSnapshot(): Promise<AlertSnapshot | null> {
  const token = process.env.ALERTS_IN_UA_TOKEN;
  if (!token) {
    console.error("alerts: ALERTS_IN_UA_TOKEN is not set");
    return null;
  }
  try {
    const response = await fetch(ACTIVE_ALERTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`alerts: upstream responded ${response.status}`);
      return null;
    }
    const { alerts } = (await response.json()) as { alerts: ActiveAlert[] };
    return { levels: toLevels(alerts), fetchedAt: new Date().toISOString() };
  } catch (error) {
    console.error(
      `alerts: request failed (${error instanceof Error ? error.name : "unknown"})`,
    );
    return null;
  }
}

let cached: { snapshot: Promise<AlertSnapshot | null>; expiresAt: number } | undefined;

/**
 * Caches the promise, so concurrent visitors share one request, and failures
 * too, so a 429 isn't answered with more requests.
 */
export function getAlertSnapshot(): Promise<AlertSnapshot | null> {
  const now = Date.now();
  if (!cached || cached.expiresAt <= now) {
    cached = { snapshot: fetchSnapshot(), expiresAt: now + CACHE_MS };
  }
  return cached.snapshot;
}
