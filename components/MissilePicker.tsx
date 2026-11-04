"use client";

import { formatKm } from "@/lib/format";
import { MISSILES, MISSILE_IDS, type MissileId } from "@/lib/missiles";

type Props = {
  /** Anchor in % of the map container. */
  left: number;
  top: number;
  onPick: (id: MissileId) => void;
};

const speedFormat = new Intl.NumberFormat("uk-UA");

export function MissilePicker({ left, top, onPick }: Props) {
  // Opens towards the map's centre so it never leaves the map.
  const shiftX = left > 60 ? "-100%" : "0%";
  const shiftY = top > 55 ? "-100%" : "0%";

  return (
    <div
      role="menu"
      aria-label="Оберіть ракету"
      className="absolute z-10 w-60 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/95 py-1 text-sm shadow-xl backdrop-blur"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${shiftX}, ${shiftY}) translate(${shiftX === "0%" ? 10 : -10}px, ${shiftY === "0%" ? 10 : -10}px)`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {MISSILE_IDS.map((id) => {
        const { name, speedKmh, rangeKm, image } = MISSILES[id];
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => onPick(id)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-zinc-800 focus-visible:bg-zinc-800 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny pixel-art icon */}
            <img
              src={image}
              alt=""
              className="size-[22.5px] shrink-0 [image-rendering:pixelated]"
            />
            <span className="flex-1 font-medium text-zinc-100">{name}</span>
            <span className="text-right text-xs leading-tight text-zinc-400 tabular-nums">
              {speedFormat.format(speedKmh)} км/год
              <br />
              до {formatKm(rangeKm)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
