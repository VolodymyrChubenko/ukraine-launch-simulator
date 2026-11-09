"use client";

import { useEffect, useMemo, useState } from "react";
import { useAlertLevels } from "@/hooks/useAlertLevels";
import { useAnimationFrame } from "@/hooks/useAnimationFrame";
import { progressAt, useMissileSession } from "@/hooks/useMissileSession";
import { useSessionId } from "@/hooks/useSessionId";
import { formatKm } from "@/lib/format";
import type { UkraineMapData } from "@/lib/geometry";
import { SPEEDS, distanceKm, type LaunchErrorCode } from "@/lib/launches";
import { MISSILES, type MissileId } from "@/lib/missiles";
import { startRestriction } from "@/lib/regions";
import { AlertLegend } from "./AlertLegend";
import { DonateBadge } from "./DonateBadge";
import { LaunchTable } from "./LaunchTable";
import { MissileLayer, type DraftLaunch } from "./MissileLayer";
import { MissilePicker } from "./MissilePicker";
import { UkraineMap, type MapClick, type MapPoint } from "./UkraineMap";

/**
 * idle → armed (launch mode on) → start (picking a missile) → aim (picking
 * the target) → launch → armed again, so several missiles can follow.
 */
type Mode =
  | { stage: "idle" }
  | { stage: "armed" }
  | { stage: "start"; from: MapPoint }
  | { stage: "aim"; from: MapPoint; missileId: MissileId };

type Hint = { id: number; text: string; left: number; top: number };

const HINT_MS = 2000;

const ERROR_TEXT: Record<LaunchErrorCode, string> = {
  outside_ukraine: "Запуск лише з території України",
  combat_zone: "Область у зоні активних бойових дій — оберіть іншу",
  out_of_range: "Поза дальністю",
  invalid_request: "Не вдалося запустити ракету",
};

// Hotspots: the ground under the launcher's missile; the sight's centre.
const LAUNCH_CURSOR = 'url("/launcher.png") 5 30, crosshair';
const AIM_CURSOR = 'url("/sight-red.png") 16 16, crosshair';
const AIM_BLOCKED_CURSOR = 'url("/sight-grey.png") 16 16, not-allowed';

const lonLat = ({ lon, lat }: MapPoint) => ({ lon, lat });

export function MissileSimulator({ map }: { map: UkraineMapData }) {
  const sid = useSessionId();
  const { speed, launches, connected, launch, setSpeed, dismissLabel } =
    useMissileSession(sid);
  const alerts = useAlertLevels();

  const [mode, setMode] = useState<Mode>({ stage: "idle" });
  const [aimInRange, setAimInRange] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [hint, setHint] = useState<Hint | null>(null);

  const now = useAnimationFrame(launches.some((l) => l.status === "flying"));
  const live = launches.map((l) => ({
    launch: l,
    progressKm: progressAt(l, speed, now),
  }));

  const viewBox = useMemo(() => {
    const [x, y, width, height] = map.viewBox.split(" ").map(Number);
    return { x, y, width, height };
  }, [map.viewBox]);
  const toPercent = ({ x, y }: MapPoint) => ({
    left: ((x - viewBox.x) / viewBox.width) * 100,
    top: ((y - viewBox.y) / viewBox.height) * 100,
  });

  const showHint = (text: string, at: MapPoint) =>
    setHint({ id: Date.now(), text, ...toPercent(at) });

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  // Esc cancels the launch being set up; with nothing to cancel, leaves the mode.
  useEffect(() => {
    if (mode.stage === "idle") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMode(mode.stage === "armed" ? { stage: "idle" } : { stage: "armed" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode.stage]);

  const handleMapClick = (click: MapClick) => {
    switch (mode.stage) {
      case "idle":
        setSelectedId(undefined);
        return;
      case "armed":
      case "start": {
        const restriction = startRestriction(click.regionId);
        if (restriction) {
          showHint(ERROR_TEXT[restriction], click);
          return;
        }
        setMode({ stage: "start", from: click });
        return;
      }
      case "aim": {
        const { from, missileId } = mode;
        if (distanceKm(from, click) > MISSILES[missileId].rangeKm) {
          showHint(ERROR_TEXT.out_of_range, click);
          return;
        }
        setMode({ stage: "armed" });
        void launch({ missileId, from: lonLat(from), to: lonLat(click) }).then(
          (result) => {
            if (!result.ok) showHint(ERROR_TEXT[result.error], click);
          },
        );
      }
    }
  };

  const handleAimMove = (point: MapPoint) => {
    if (mode.stage !== "aim") return;
    setAimInRange(
      distanceKm(mode.from, point) <= MISSILES[mode.missileId].rangeKm,
    );
  };

  const pickMissile = (missileId: MissileId) => {
    if (mode.stage !== "start") return;
    setAimInRange(true);
    setMode({ stage: "aim", from: mode.from, missileId });
  };

  const toggleSelected = (id: string) =>
    setSelectedId((current) => (current === id ? undefined : id));

  const draft: DraftLaunch | undefined =
    mode.stage === "start" || mode.stage === "aim"
      ? {
          from: lonLat(mode.from),
          missileId: mode.stage === "aim" ? mode.missileId : undefined,
        }
      : undefined;

  const cursor =
    mode.stage === "idle"
      ? undefined
      : mode.stage !== "aim"
        ? LAUNCH_CURSOR
        : aimInRange
          ? AIM_CURSOR
          : AIM_BLOCKED_CURSOR;

  const instruction = {
    idle: null,
    armed: "Оберіть старт поза зоною бойових дій",
    start: "Оберіть ракету",
    aim:
      mode.stage === "aim" &&
      `Оберіть ціль у межах ${formatKm(MISSILES[mode.missileId].rangeKm)}`,
  }[mode.stage];

  const highlightedId = hoveredId ?? selectedId;

  return (
    // One grid on lg: the launch list shares a row with the map, so it is
    // exactly as tall as the map (the list itself is absolutely positioned).
    <div className="grid w-full gap-x-6 gap-y-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setMode(
                mode.stage === "idle" ? { stage: "armed" } : { stage: "idle" },
              )
            }
            aria-pressed={mode.stage !== "idle"}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              mode.stage === "idle"
                ? "border-sky-500 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25"
                : "border-zinc-500 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
          >
            {mode.stage === "idle" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny pixel-art icon */}
                <img
                  src="/missle.png"
                  alt=""
                  className="-my-1 size-[22.5px] shrink-0"
                />
                Запустити ракету
              </>
            ) : (
              "Завершити запуски"
            )}
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-2 max-[427px]:gap-0">
            <span aria-hidden title="Прискорення часу">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny pixel-art icon */}
              <img src="/hourglass.png" alt="" className="size-[22.5px]" />
            </span>
            <div
              role="group"
              aria-label="Прискорення часу"
              className="flex overflow-hidden rounded-md border border-zinc-700 text-sm"
            >
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void setSpeed(value)}
                  aria-pressed={speed === value}
                  className={`px-2.5 py-1 tabular-nums transition ${
                    speed === value
                      ? "bg-zinc-200 text-zinc-900"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  ×{value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Always rendered, one line tall: the map must not shift between steps. */}
        <span
          aria-live="polite"
          className="min-h-5 truncate text-sm text-zinc-400"
        >
          {instruction && (
            <>
              {instruction}
              {/* No Esc key on touch screens; «Завершити запуски» cancels there. */}
              <span className="text-zinc-600 pointer-coarse:hidden">
                {" "}
                · Esc — скасувати
              </span>
            </>
          )}
        </span>
      </div>

      <div className="relative lg:col-start-2 lg:row-start-2">
        <UkraineMap
          map={map}
          alertLevels={alerts.status === "ready" ? alerts.levels : undefined}
          cursor={cursor}
          onMapClick={handleMapClick}
          onMapMove={mode.stage === "aim" ? handleAimMove : undefined}
          onContextMenu={
            mode.stage === "start" || mode.stage === "aim"
              ? () => setMode({ stage: "armed" })
              : undefined
          }
        >
          <MissileLayer
            launches={live}
            draft={draft}
            highlightedId={highlightedId}
            interactive={mode.stage === "idle"}
            onSelect={toggleSelected}
            onDismiss={dismissLabel}
          />
        </UkraineMap>

        <DonateBadge disabled={mode.stage !== "idle"} />

        {mode.stage === "start" && (
          <MissilePicker {...toPercent(mode.from)} onPick={pickMissile} />
        )}

        {hint && (
          <p
            key={hint.id}
            role="status"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap text-zinc-100 shadow-lg"
            style={{ left: `${hint.left}%`, top: `${hint.top}%` }}
          >
            {hint.text}
          </p>
        )}
      </div>

      <div className="lg:col-start-2 lg:row-start-3">
        <AlertLegend alerts={alerts} />
      </div>

      <h2 className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-300 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:self-end">
        Запуски
        <span
          className={`size-2 rounded-full ${connected ? "bg-emerald-400" : "bg-zinc-600"}`}
          title={
            connected ? "Зʼєднано з сервером" : "Немає зʼєднання з сервером"
          }
        />
      </h2>
      <aside
        aria-label="Запуски"
        className="lg:relative lg:col-start-1 lg:row-start-2"
      >
        <LaunchTable
          launches={live}
          highlightedId={highlightedId}
          onSelect={toggleSelected}
          onHover={setHoveredId}
        />
      </aside>
    </div>
  );
}
