"use client";

import {
  memo,
  useMemo,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { GeoProjection } from "d3-geo";
import { ALERT_FILL, type AlertLevels } from "@/lib/alerts";
import { FRONTLINE_FILL, FRONTLINE_LAYERS } from "@/lib/frontline";
import type { UkraineMapData } from "@/lib/geometry";
import { projectionFromParams, type LonLat } from "@/lib/projection";
import { isRegionId, type RegionId } from "@/lib/regions";
import { MapProjectionContext } from "./MapProjectionContext";

/** A point on the map: real-world coordinates plus SVG (viewBox) ones. */
export type MapPoint = LonLat & { x: number; y: number };

export type MapClick = MapPoint & { regionId?: RegionId };

type Props = {
  map: UkraineMapData;
  alertLevels?: AlertLevels;
  /** Any click on the map, including the sea and other countries. */
  onMapClick?: (click: MapClick) => void;
  onMapMove?: (point: MapPoint) => void;
  onContextMenu?: () => void;
  cursor?: CSSProperties["cursor"];
  /** Layers drawn over the map; they can use useMapProjection(). */
  children?: ReactNode;
};

function toMapPoint(
  event: MouseEvent<SVGSVGElement>,
  projection: GeoProjection,
): MapPoint | null {
  // Screen pixels → SVG viewBox units, which is what the projection works in.
  const matrix = event.currentTarget.getScreenCTM();
  if (!matrix) return null;
  const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  const lonLat = projection.invert?.([x, y]);
  return lonLat ? { lon: lonLat[0], lat: lonLat[1], x, y } : null;
}

export function UkraineMap({
  map,
  alertLevels,
  onMapClick,
  onMapMove,
  onContextMenu,
  cursor,
  children,
}: Props) {
  const context = useMemo(
    () => ({ projection: projectionFromParams(map.projection) }),
    [map.projection],
  );

  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    const point = toMapPoint(event, context.projection);
    if (!point) return;
    const region = (event.target as Element)
      .closest("[data-region]")
      ?.getAttribute("data-region");
    onMapClick({
      ...point,
      regionId: region && isRegionId(region) ? region : undefined,
    });
  };

  const handleMove = (event: MouseEvent<SVGSVGElement>) => {
    const point = onMapMove && toMapPoint(event, context.projection);
    if (point) onMapMove(point);
  };

  const handleContextMenu = (event: MouseEvent<SVGSVGElement>) => {
    if (!onContextMenu) return;
    event.preventDefault();
    onContextMenu();
  };

  return (
    <MapProjectionContext value={context}>
      <svg
        viewBox={map.viewBox}
        className="h-auto w-full select-none rounded-lg bg-[#0f1115]"
        style={{ cursor }}
        role="img"
        aria-label="Мапа України та сусідніх країн"
        onClick={handleClick}
        onMouseMove={onMapMove ? handleMove : undefined}
        onContextMenu={handleContextMenu}
      >
        <MapBase map={map} alertLevels={alertLevels} />
        {children}
      </svg>
    </MapProjectionContext>
  );
}

/** Static part of the map: memoised so 60 fps overlays don't re-render it. */
const MapBase = memo(function MapBase({
  map,
  alertLevels,
}: Pick<Props, "map" | "alertLevels">) {
  return (
    <>
      <g aria-hidden className="fill-[#1c2027]">
        {map.neighbors.map(({ name, path }) => (
          <path key={name} d={path}>
            <title>{name}</title>
          </path>
        ))}
      </g>
      <path
        aria-hidden
        d={map.neighborBorders}
        className="pointer-events-none fill-none stroke-[#2b303a] stroke-[0.6]"
      />
      {/* Country borders over region borders, thicker so they stand out. */}
      <g aria-hidden className="pointer-events-none fill-none stroke-[#2b303a] stroke-[1.5]">
        {map.neighbors.map(({ name, path }) => (
          <path key={name} d={path} />
        ))}
      </g>

      {map.regions.map(({ id, name, path }) => {
        const level = alertLevels?.[id];
        return (
          <path
            key={id}
            d={path}
            data-region={id}
            aria-label={name}
            className="fill-[#3b4049] stroke-[#0f1115] stroke-1"
            style={level && { fill: ALERT_FILL[level] }}
          >
            <title>{name}</title>
          </path>
        );
      })}

      {/* Clicks pass through to the regions: they decide where a launch starts. */}
      <g aria-hidden className="pointer-events-none">
        {FRONTLINE_LAYERS.map((layer) => (
          <path
            key={layer}
            d={map.frontline[layer]}
            fill={FRONTLINE_FILL[layer]}
            fillOpacity={0.3}
          />
        ))}
        <path
          d={map.frontline.line}
          className="fill-none stroke-[#d6402a] stroke-[1.2] [stroke-linejoin:round]"
        />
      </g>

      <g
        aria-hidden
        className="pointer-events-none fill-[#3b4049] text-[12px] font-medium tracking-wider uppercase"
      >
        {map.countryLabels.map(({ name, x, y }) => (
          <text key={name} x={x} y={y} textAnchor="middle" dominantBaseline="central">
            {name}
          </text>
        ))}
      </g>

      <g aria-hidden className="pointer-events-none fill-[#2b303a] font-medium">
        {map.neighborCapitals.map(({ name, x, y, capital, anchor }) => (
          <g key={name}>
            <circle cx={x} cy={y} r={capital ? 2.2 : 1.6} />
            <text
              x={x}
              y={y - (capital ? 5 : 4)}
              textAnchor={anchor}
              className={capital ? "text-[11px] font-semibold" : "text-[9px]"}
            >
              {name}
            </text>
          </g>
        ))}
      </g>

      <g
        aria-hidden
        className="pointer-events-none fill-white stroke-[#0f1115] text-[9px] font-medium [paint-order:stroke] [stroke-linejoin:round]"
      >
        {map.regions.map(({ id, capital }) =>
          capital ? (
            <g key={id}>
              <circle cx={capital.x} cy={capital.y} r={1.6} strokeWidth={0.8} />
              <text
                x={capital.x}
                y={capital.y - 4}
                textAnchor={capital.anchor ?? "middle"}
                strokeWidth={2.5}
              >
                {capital.name}
              </text>
            </g>
          ) : null,
        )}
      </g>
    </>
  );
});
