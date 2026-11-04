export const REGION_NAMES = {
  cherkasy: "Черкаська область",
  chernihiv: "Чернігівська область",
  chernivtsi: "Чернівецька область",
  crimea: "Автономна Республіка Крим",
  dnipropetrovsk: "Дніпропетровська область",
  donetsk: "Донецька область",
  "ivano-frankivsk": "Івано-Франківська область",
  kharkiv: "Харківська область",
  kherson: "Херсонська область",
  khmelnytskyi: "Хмельницька область",
  kirovohrad: "Кіровоградська область",
  kyiv: "Київська область",
  "kyiv-city": "м. Київ",
  luhansk: "Луганська область",
  lviv: "Львівська область",
  mykolaiv: "Миколаївська область",
  odessa: "Одеська область",
  poltava: "Полтавська область",
  rivne: "Рівненська область",
  sumy: "Сумська область",
  ternopil: "Тернопільська область",
  vinnytsia: "Вінницька область",
  volyn: "Волинська область",
  zakarpattia: "Закарпатська область",
  zaporizhia: "Запорізька область",
  zhytomyr: "Житомирська область",
} as const;

export type RegionId = keyof typeof REGION_NAMES;

export const isRegionId = (id: string): id is RegionId => id in REGION_NAMES;

export type Capital = {
  name: string;
  lon: number;
  lat: number;
  /** Label alignment for cities near the map edge. */
  anchor?: "start" | "middle" | "end";
};

/** Kyiv oblast has no entry: its centre is Kyiv, which is labelled on kyiv-city. */
export const CAPITALS: Partial<Record<RegionId, Capital>> = {
  cherkasy: { name: "Черкаси", lat: 49.4444, lon: 32.0598 },
  chernihiv: { name: "Чернігів", lat: 51.4982, lon: 31.2893 },
  chernivtsi: { name: "Чернівці", lat: 48.2915, lon: 25.9403 },
  crimea: { name: "Сімферополь", lat: 44.9521, lon: 34.1024 },
  dnipropetrovsk: { name: "Дніпро", lat: 48.4647, lon: 35.0462 },
  donetsk: { name: "Донецьк", lat: 48.0159, lon: 37.8028 },
  "ivano-frankivsk": { name: "Івано-Франківськ", lat: 48.9226, lon: 24.7111 },
  kharkiv: { name: "Харків", lat: 49.9935, lon: 36.2304 },
  kherson: { name: "Херсон", lat: 46.6354, lon: 32.6169 },
  khmelnytskyi: { name: "Хмельницький", lat: 49.4229, lon: 26.9871 },
  kirovohrad: { name: "Кропивницький", lat: 48.5079, lon: 32.2623 },
  "kyiv-city": { name: "Київ", lat: 50.4501, lon: 30.5234 },
  luhansk: { name: "Луганськ", lat: 48.574, lon: 39.3078, anchor: "end" },
  lviv: { name: "Львів", lat: 49.8397, lon: 24.0297 },
  mykolaiv: { name: "Миколаїв", lat: 46.975, lon: 31.9946 },
  odessa: { name: "Одеса", lat: 46.4825, lon: 30.7233 },
  poltava: { name: "Полтава", lat: 49.5883, lon: 34.5514 },
  rivne: { name: "Рівне", lat: 50.6199, lon: 26.2516 },
  sumy: { name: "Суми", lat: 50.9077, lon: 34.7981 },
  ternopil: { name: "Тернопіль", lat: 49.5535, lon: 25.5948 },
  vinnytsia: { name: "Вінниця", lat: 49.2331, lon: 28.4682 },
  volyn: { name: "Луцьк", lat: 50.7472, lon: 25.3254 },
  zakarpattia: { name: "Ужгород", lat: 48.6208, lon: 22.2879, anchor: "start" },
  zaporizhia: { name: "Запоріжжя", lat: 47.8388, lon: 35.1396 },
  zhytomyr: { name: "Житомир", lat: 50.2547, lon: 28.6587 },
};

/**
 * Temporarily and partly occupied regions with active combat. The simulator
 * treats them as whole regions: no launches from them, and a strike on them
 * counts as "hit". The front line on the map is drawn for reference only.
 */
export const OCCUPIED_REGIONS: ReadonlySet<RegionId> = new Set([
  "crimea",
  "donetsk",
  "kherson",
  "luhansk",
  "zaporizhia",
]);

export const isControlledRegion = (id: RegionId | undefined): id is RegionId =>
  id !== undefined && !OCCUPIED_REGIONS.has(id);

export type StartRestriction = "outside_ukraine" | "combat_zone";

/** Why a launch can't start in this region, or null if it can. */
export const startRestriction = (
  id: RegionId | undefined,
): StartRestriction | null =>
  id === undefined ? "outside_ukraine" : OCCUPIED_REGIONS.has(id) ? "combat_zone" : null;
