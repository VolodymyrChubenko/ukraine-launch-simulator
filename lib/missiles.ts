/** Images live in public/; in all of them the nose points to the top-right corner. */
export const MISSILES = {
  neptune: { name: "Нептун", speedKmh: 900, rangeKm: 300, image: "/neptun.png" },
  flamingo: { name: "Фламінго", speedKmh: 900, rangeKm: 3000, image: "/flamingo.png" },
  sapsan: { name: "Сапсан", speedKmh: 6370, rangeKm: 1000, image: "/sapsan.png" },
  peklo: { name: "Пекло", speedKmh: 700, rangeKm: 700, image: "/peklo.png" },
} as const;

export type MissileId = keyof typeof MISSILES;

export const MISSILE_IDS = Object.keys(MISSILES) as MissileId[];

export const isMissileId = (id: unknown): id is MissileId =>
  typeof id === "string" && id in MISSILES;
