// Shared by the mock API (lib/server/sessions.ts) and the client, so both
// sides move a missile by exactly the same rules.
import { geoDistance, geoInterpolate } from "d3-geo";
import { MISSILES, type MissileId } from "./missiles";
import type { LonLat } from "./projection";
import type { StartRestriction } from "./regions";

export const EARTH_RADIUS_KM = 6371.0088;

export const SPEEDS = [1, 10, 60, 120] as const;
export type SpeedMultiplier = (typeof SPEEDS)[number];
export const DEFAULT_SPEED: SpeedMultiplier = 60;

export const isSpeed = (value: unknown): value is SpeedMultiplier =>
  SPEEDS.includes(value as SpeedMultiplier);

/** "intercepted": the target is on controlled territory; "hit": anywhere else. */
export type LaunchStatus = "flying" | "intercepted" | "hit";

export type Launch = {
  id: string;
  /** 1-based, per session — shown in the table as "#3 Нептун". */
  number: number;
  missileId: MissileId;
  from: LonLat;
  to: LonLat;
  distanceKm: number;
  progressKm: number;
  status: LaunchStatus;
  /** The result label at the target was clicked away. */
  labelDismissed: boolean;
};

/** `progressKm` values are as of the moment the snapshot was sent. */
export type SessionSnapshot = {
  speed: SpeedMultiplier;
  launches: Launch[];
};

export type LaunchRequest = { missileId: MissileId; from: LonLat; to: LonLat };

export type LaunchErrorCode = "invalid_request" | "out_of_range" | StartRestriction;

export const STATUS_LABEL: Record<LaunchStatus, string> = {
  flying: "В польоті",
  intercepted: "Ракету збито",
  hit: "Ціль уражено",
};

export const distanceKm = (a: LonLat, b: LonLat) =>
  geoDistance([a.lon, a.lat], [b.lon, b.lat]) * EARTH_RADIUS_KM;

/** Simulated distance a missile covers in `elapsedMs` of real time. */
export const flownKm = (
  missileId: MissileId,
  speed: SpeedMultiplier,
  elapsedMs: number,
) => (MISSILES[missileId].speedKmh * speed * elapsedMs) / 3_600_000;

/** Great-circle point at `progressKm` along the launch's path. */
export function positionAt(launch: Launch, progressKm: number): LonLat {
  const t = launch.distanceKm > 0 ? progressKm / launch.distanceKm : 1;
  const [lon, lat] = geoInterpolate(
    [launch.from.lon, launch.from.lat],
    [launch.to.lon, launch.to.lat],
  )(Math.min(Math.max(t, 0), 1));
  return { lon, lat };
}
