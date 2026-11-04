"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SPEED,
  flownKm,
  type Launch,
  type LaunchErrorCode,
  type LaunchRequest,
  type SessionSnapshot,
  type SpeedMultiplier,
} from "@/lib/launches";

/** A launch plus the client time its `progressKm` was valid at. */
export type SyncedLaunch = Launch & { syncedAt: number };

type State = { speed: SpeedMultiplier; launches: SyncedLaunch[] };

/**
 * `dismissed` keeps labels hidden that the server may not have processed yet,
 * so a snapshot sent before the PATCH doesn't bring them back.
 */
const sync = (
  snapshot: SessionSnapshot,
  at: number,
  dismissed: ReadonlySet<string>,
): State => ({
  speed: snapshot.speed,
  launches: snapshot.launches.map((launch) => ({
    ...launch,
    labelDismissed: launch.labelDismissed || dismissed.has(launch.id),
    syncedAt: at,
  })),
});

const upsert = (launches: SyncedLaunch[], launch: SyncedLaunch) =>
  launches.some((l) => l.id === launch.id)
    ? launches.map((l) => (l.id === launch.id ? launch : l))
    : [...launches, launch];

/**
 * Extrapolates the server's position to `now`. Stops at the target: the
 * outcome arrives with the next snapshot.
 */
export const progressAt = (
  launch: SyncedLaunch,
  speed: SpeedMultiplier,
  now: number,
) =>
  launch.status === "flying"
    ? Math.min(
        launch.distanceKm,
        launch.progressKm +
          flownKm(launch.missileId, speed, Math.max(0, now - launch.syncedAt)),
      )
    : launch.distanceKm;

export type LaunchResult = { ok: true } | { ok: false; error: LaunchErrorCode };

export function useMissileSession(sid: string | null) {
  const [state, setState] = useState<State>({ speed: DEFAULT_SPEED, launches: [] });
  const [connected, setConnected] = useState(false);
  const dismissed = useRef(new Set<string>());

  useEffect(() => {
    if (!sid) return;
    const source = new EventSource(`/api/sessions/${sid}/stream`);
    source.addEventListener("snapshot", (event) => {
      setState(
        sync(JSON.parse(event.data) as SessionSnapshot, Date.now(), dismissed.current),
      );
      setConnected(true);
    });
    // EventSource reconnects by itself; this only drives the status badge.
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, [sid]);

  const launch = useCallback(
    async (request: LaunchRequest): Promise<LaunchResult> => {
      if (!sid) return { ok: false, error: "invalid_request" };
      const response = await fetch(`/api/sessions/${sid}/launches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }).catch(() => null);
      if (!response) return { ok: false, error: "invalid_request" };
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as {
          error?: LaunchErrorCode;
        };
        return { ok: false, error: error ?? "invalid_request" };
      }
      const created = (await response.json()) as Launch;
      setState((prev) => ({
        ...prev,
        launches: upsert(prev.launches, { ...created, syncedAt: Date.now() }),
      }));
      return { ok: true };
    },
    [sid],
  );

  const setSpeed = useCallback(
    async (speed: SpeedMultiplier) => {
      if (!sid) return;
      const response = await fetch(`/api/sessions/${sid}/speed`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      });
      if (response.ok) {
        setState(
          sync((await response.json()) as SessionSnapshot, Date.now(), dismissed.current),
        );
      }
    },
    [sid],
  );

  const dismissLabel = useCallback(
    (id: string) => {
      if (!sid) return;
      dismissed.current.add(id);
      setState((prev) => ({
        ...prev,
        launches: prev.launches.map((l) =>
          l.id === id ? { ...l, labelDismissed: true } : l,
        ),
      }));
      void fetch(`/api/sessions/${sid}/launches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelDismissed: true }),
      });
    },
    [sid],
  );

  return { ...state, connected, launch, setSpeed, dismissLabel };
}
