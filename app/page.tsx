import { MissileSimulator } from "@/components/MissileSimulator";
import { buildUkraineMap } from "@/lib/geometry";

const ukraineMap = buildUkraineMap();

const frontlineDate = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "short",
  timeZone: "Europe/Kyiv",
}).format(new Date(ukraineMap.frontline.updatedAt));

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-8 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Симулятор запусків</h1>
      <MissileSimulator map={ukraineMap} />
      <footer className="mt-auto text-center text-xs text-zinc-500">
        Кордони: ДНВП «Картографія» /{" "}
        <a
          href="https://data.humdata.org/dataset/cod-ab-ukr"
          className="underline hover:text-zinc-300"
        >
          OCHA HDX
        </a>
        , via{" "}
        <a
          href="https://www.geoboundaries.org"
          className="underline hover:text-zinc-300"
        >
          geoBoundaries
        </a>{" "}
        (CC BY 3.0 IGO) · Сусідні країни:{" "}
        <a
          href="https://www.naturalearthdata.com"
          className="underline hover:text-zinc-300"
        >
          Natural Earth
        </a>{" "}
        · Лінія фронту:{" "}
        <a
          href="https://deepstatemap.live"
          className="underline hover:text-zinc-300"
        >
          DeepStateMap
        </a>
        , станом на {frontlineDate} · Тривоги:{" "}
        <a
          href="https://alerts.in.ua"
          className="underline hover:text-zinc-300"
        >
          alerts.in.ua
        </a>
      </footer>
    </main>
  );
}
