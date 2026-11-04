"use client";

import { formatCoords } from "@/lib/format";
import { STATUS_LABEL, positionAt, type LaunchStatus } from "@/lib/launches";
import { MISSILES } from "@/lib/missiles";
import type { LiveLaunch } from "./MissileLayer";

type Props = {
  launches: LiveLaunch[];
  highlightedId?: string;
  onSelect: (id: string) => void;
  onHover: (id: string | undefined) => void;
};

const STATUS_STYLE: Record<LaunchStatus, string> = {
  flying: "bg-amber-400/15 text-amber-300",
  intercepted: "bg-sky-400/15 text-sky-300",
  hit: "bg-emerald-500/15 text-emerald-400",
};

const BAR_STYLE: Record<LaunchStatus, string> = {
  flying: "bg-amber-400",
  intercepted: "bg-sky-400",
  hit: "bg-emerald-500",
};

export function LaunchTable({
  launches,
  highlightedId,
  onSelect,
  onHover,
}: Props) {
  if (launches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
        Запусків ще немає. Натисніть «Запустити ракету» і оберіть точку на мапі.
      </p>
    );
  }

  // Newest first; the history is never cleared.
  const rows = [...launches].reverse();

  return (
    <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
      {rows.map(({ launch, progressKm }) => {
        const highlighted = launch.id === highlightedId;
        const percent =
          launch.distanceKm > 0 ? (progressKm / launch.distanceKm) * 100 : 100;
        return (
          <li key={launch.id}>
            <button
              type="button"
              onClick={() => onSelect(launch.id)}
              onMouseEnter={() => onHover(launch.id)}
              onMouseLeave={() => onHover(undefined)}
              aria-pressed={highlighted}
              className={`flex w-full flex-col gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                highlighted
                  ? "border-amber-300/70 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny pixel-art icon */}
                <img
                  src={MISSILES[launch.missileId].image}
                  alt=""
                  className="size-[22.5px] shrink-0 [image-rendering:pixelated]"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-zinc-100">
                    #{launch.number} {MISSILES[launch.missileId].name}
                  </span>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {formatCoords(positionAt(launch, progressKm))}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[launch.status]}`}
                >
                  {STATUS_LABEL[launch.status]}
                </span>
              </span>
              <span
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                className="h-1 overflow-hidden rounded-full bg-zinc-700"
              >
                <span
                  className={`block h-full ${BAR_STYLE[launch.status]}`}
                  style={{ width: `${percent}%` }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
