"use client";

import { useMemo, type MouseEvent } from "react";
import { geoCircle, geoPath, type GeoProjection } from "d3-geo";
import type { LineString } from "geojson";
import {
  EARTH_RADIUS_KM,
  STATUS_LABEL,
  positionAt,
  type Launch,
} from "@/lib/launches";
import { MISSILES, type MissileId } from "@/lib/missiles";
import type { LonLat } from "@/lib/projection";
import { useMapProjection } from "./MapProjectionContext";

export type LiveLaunch = { launch: Launch; progressKm: number };

/** The launch being set up: start picked, maybe a missile too. */
export type DraftLaunch = { from: LonLat; missileId?: MissileId };

type Props = {
  launches: LiveLaunch[];
  draft?: DraftLaunch;
  highlightedId?: string;
  /** Off while launching, so clicks on missiles and labels reach the map. */
  interactive: boolean;
  onSelect: (id: string) => void;
  onDismiss: (id: string) => void;
};

const line = (a: LonLat, b: LonLat): LineString => ({
  type: "LineString",
  coordinates: [
    [a.lon, a.lat],
    [b.lon, b.lat],
  ],
});

const project = (projection: GeoProjection, { lon, lat }: LonLat) =>
  projection([lon, lat]) ?? [NaN, NaN];

/** Missile images point up-right, so they need +45° on top of the flight direction. */
function rocketAngle(projection: GeoProjection, launch: Launch, progressKm: number) {
  const step = Math.max(launch.distanceKm * 0.01, 0.1);
  const behind = Math.min(progressKm, launch.distanceKm - step);
  const [x0, y0] = project(projection, positionAt(launch, behind));
  const [x1, y1] = project(projection, positionAt(launch, behind + step));
  return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 45;
}

const stop = (event: MouseEvent, action: () => void) => {
  event.stopPropagation();
  action();
};

/** Side of a missile image, in SVG units. */
const MISSILE_SIZE = 32;
/** Side of the fire image at a hit target; its flame base sits on the point. */
const FIRE_SIZE = 24;
const FIRE_BASE = 0.94;
/** The flame fills ~64% of the image width. */
const FIRE_HALF_WIDTH = 0.32;
/** Visual centre of the flame body (sparks above it excluded), from the top. */
const FIRE_CENTER = 0.62;

export function MissileLayer({
  launches,
  draft,
  highlightedId,
  interactive,
  onSelect,
  onDismiss,
}: Props) {
  const { projection } = useMapProjection();
  const toPath = useMemo(() => geoPath(projection), [projection]);

  const rangePath = useMemo(() => {
    if (!draft?.missileId) return null;
    const radius =
      (MISSILES[draft.missileId].rangeKm / EARTH_RADIUS_KM) * (180 / Math.PI);
    return toPath(
      geoCircle().center([draft.from.lon, draft.from.lat]).radius(radius)(),
    );
  }, [draft, toPath]);

  const flying = launches.filter(({ launch }) => launch.status === "flying");
  const labels = launches.filter(
    ({ launch }) => launch.status !== "flying" && !launch.labelDismissed,
  );

  const clickable = interactive ? "cursor-pointer" : "pointer-events-none";

  return (
    <g>
      {draft && (
        <g className="pointer-events-none">
          {rangePath && (
            <path
              d={rangePath}
              className="fill-sky-400/10 stroke-sky-400 stroke-1 [stroke-dasharray:4_3]"
            />
          )}
          <StartPoint at={project(projection, draft.from)} pulse />
        </g>
      )}

      {flying.map(({ launch, progressKm }) => {
        const current = positionAt(launch, progressKm);
        const [x, y] = project(projection, current);
        const [tx, ty] = project(projection, launch.to);
        const highlighted = launch.id === highlightedId;
        return (
          <g key={launch.id}>
            <g
              className={`pointer-events-none fill-none ${
                highlighted ? "stroke-amber-300" : "stroke-sky-300"
              }`}
              strokeWidth={highlighted ? 2 : 1.4}
            >
              <path d={toPath(line(launch.from, current)) ?? ""} />
              <path
                d={toPath(line(current, launch.to)) ?? ""}
                strokeDasharray="4 4"
                className="opacity-70"
              />
              <StartPoint at={project(projection, launch.from)} />
              <circle cx={tx} cy={ty} r={4} />
              <circle
                cx={tx}
                cy={ty}
                r={1}
                className={highlighted ? "fill-amber-300" : "fill-sky-300"}
              />
            </g>
            <g
              role="button"
              aria-label={`${MISSILES[launch.missileId].name} #${launch.number}`}
              className={clickable}
              onClick={(event) => stop(event, () => onSelect(launch.id))}
            >
              {highlighted && (
                <circle
                  cx={x}
                  cy={y}
                  r={MISSILE_SIZE / 2 + 2}
                  className="fill-amber-300/25 stroke-amber-300"
                />
              )}
              <circle cx={x} cy={y} r={MISSILE_SIZE / 2} className="fill-transparent" />
              <image
                href={MISSILES[launch.missileId].image}
                x={x - MISSILE_SIZE / 2}
                y={y - MISSILE_SIZE / 2}
                width={MISSILE_SIZE}
                height={MISSILE_SIZE}
                style={{ imageRendering: "pixelated" }}
                transform={`rotate(${rocketAngle(projection, launch, progressKm)} ${x} ${y})`}
              />
            </g>
          </g>
        );
      })}

      {labels.map(({ launch }) => {
        const [x, y] = project(projection, launch.to);
        const intercepted = launch.status === "intercepted";
        const highlighted = launch.id === highlightedId;
        const fireTop = y - FIRE_SIZE * FIRE_BASE;
        return (
          <g
            key={launch.id}
            role="button"
            aria-label={`${STATUS_LABEL[launch.status]} — прибрати напис`}
            className={clickable}
            onClick={(event) => stop(event, () => onDismiss(launch.id))}
          >
            {intercepted ? (
              <circle cx={x} cy={y} r={4} className="fill-sky-400" />
            ) : (
              <image
                href="/fire.png"
                x={x - FIRE_SIZE / 2}
                y={fireTop}
                width={FIRE_SIZE}
                height={FIRE_SIZE}
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <text
              // Next to the dot, or centred on the flame's height beside it.
              x={x + (intercepted ? 7 : FIRE_SIZE * FIRE_HALF_WIDTH + 3)}
              y={intercepted ? y : fireTop + FIRE_SIZE * FIRE_CENTER}
              dominantBaseline="central"
              strokeWidth={3}
              className={`stroke-[#0f1115] text-[11px] font-semibold [paint-order:stroke] [stroke-linejoin:round] ${
                intercepted ? "fill-sky-300" : "fill-emerald-400"
              } ${highlighted ? "underline" : ""}`}
            >
              {STATUS_LABEL[launch.status]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function StartPoint({ at: [x, y], pulse }: { at: number[]; pulse?: boolean }) {
  return (
    <>
      {pulse && (
        <circle cx={x} cy={y} r={7} className="animate-ping fill-sky-400/40 transform-fill origin-center" />
      )}
      <circle cx={x} cy={y} r={3} className="fill-sky-400 stroke-[#0f1115] stroke-1" />
    </>
  );
}
