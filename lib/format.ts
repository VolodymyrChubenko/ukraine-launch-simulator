import type { LonLat } from "./projection";

export const formatCoords = ({ lat, lon }: LonLat) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "пн. ш." : "пд. ш."}, ` +
  `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "сх. д." : "зх. д."}`;

const kmFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export const formatKm = (km: number) => `${kmFormat.format(km)} км`;
