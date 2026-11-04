// Mock API state: one simulation per browser tab (session id from
// sessionStorage), kept in memory. Restarting the server clears it.
import { randomUUID } from "node:crypto";
import {
  DEFAULT_SPEED,
  distanceKm,
  flownKm,
  type Launch,
  type LaunchErrorCode,
  type SessionSnapshot,
  type SpeedMultiplier,
} from "@/lib/launches";
import { MISSILES, isMissileId } from "@/lib/missiles";
import type { LonLat } from "@/lib/projection";
import { isControlledRegion, startRestriction } from "@/lib/regions";
import { regionAt } from "./region-lookup";

type Session = {
  speed: SpeedMultiplier;
  launches: Launch[];
  /** Time up to which `progressKm` values are computed. */
  advancedAt: number;
  lastSeen: number;
};

const SESSION_TTL_MS = 60 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// globalThis keeps sessions alive across dev-server hot reloads.
const store = ((globalThis as { __missileSessions?: Map<string, Session> })
  .__missileSessions ??= new Map());

export const isSessionId = (id: string) => UUID_RE.test(id);

function prune(now: number) {
  for (const [id, session] of store) {
    if (now - session.lastSeen > SESSION_TTL_MS) store.delete(id);
  }
}

/** Gets the session, moved forward to `now`. */
function session(sid: string, now = Date.now()): Session {
  let current = store.get(sid);
  if (!current) {
    prune(now);
    current = { speed: DEFAULT_SPEED, launches: [], advancedAt: now, lastSeen: now };
    store.set(sid, current);
  }
  current.lastSeen = now;

  const elapsed = now - current.advancedAt;
  if (elapsed > 0) {
    for (const launch of current.launches) {
      if (launch.status !== "flying") continue;
      launch.progressKm = Math.min(
        launch.distanceKm,
        launch.progressKm + flownKm(launch.missileId, current.speed, elapsed),
      );
      if (launch.progressKm >= launch.distanceKm) {
        launch.status = isControlledRegion(regionAt(launch.to))
          ? "intercepted"
          : "hit";
      }
    }
    current.advancedAt = now;
  }
  return current;
}

export function snapshot(sid: string): SessionSnapshot {
  const { speed, launches } = session(sid);
  return { speed, launches };
}

const isLonLat = (value: unknown): value is LonLat => {
  const { lon, lat } = (value ?? {}) as Partial<LonLat>;
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon!) <= 180 &&
    Math.abs(lat!) <= 90
  );
};

export function createLaunch(
  sid: string,
  body: unknown,
): { launch: Launch } | { error: LaunchErrorCode } {
  const { missileId, from, to } = (body ?? {}) as Record<string, unknown>;
  if (!isMissileId(missileId) || !isLonLat(from) || !isLonLat(to)) {
    return { error: "invalid_request" };
  }
  const restriction = startRestriction(regionAt(from));
  if (restriction) return { error: restriction };

  const distance = distanceKm(from, to);
  if (distance > MISSILES[missileId].rangeKm) return { error: "out_of_range" };

  const current = session(sid);
  const launch: Launch = {
    id: randomUUID(),
    number: current.launches.length + 1,
    missileId,
    from: { lon: from.lon, lat: from.lat },
    to: { lon: to.lon, lat: to.lat },
    distanceKm: distance,
    progressKm: 0,
    status: "flying",
    labelDismissed: false,
  };
  current.launches.push(launch);
  return { launch };
}

/** Flights in progress keep their position and continue at the new speed. */
export function setSpeed(sid: string, speed: SpeedMultiplier): SessionSnapshot {
  session(sid).speed = speed;
  return snapshot(sid);
}

export function dismissLabel(sid: string, launchId: string): Launch | undefined {
  const launch = session(sid).launches.find((l) => l.id === launchId);
  if (!launch || launch.status === "flying") return undefined;
  launch.labelDismissed = true;
  return launch;
}
