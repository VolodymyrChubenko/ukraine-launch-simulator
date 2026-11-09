// Shared by lib/server/alerts.ts (server) and the map (client); keep it free of
// secrets and data imports.
import type { RegionId } from "./regions";

export type AlertLevel = "red" | "yellow";

/** Regions without an active alert have no entry. */
export type AlertLevels = Partial<Record<RegionId, AlertLevel>>;

export type AlertSnapshot = { levels: AlertLevels; fetchedAt: string };

/**
 * Coral (#ff5a4f) and yellow (#ffcf40) at 40% over the region grey: alerts are
 * a secondary layer and mustn't draw attention away from the missiles.
 */
export const ALERT_FILL: Record<AlertLevel, string> = {
  red: "#894a4b",
  yellow: "#897945",
};

export const NO_ALERT_FILL = "#3b4049";
