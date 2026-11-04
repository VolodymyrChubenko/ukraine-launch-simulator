import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Про проєкт · Симулятор запусків",
};

const Tech = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-zinc-100">{children}</span>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-xs text-zinc-200">{children}</code>
);

const TECH_GROUPS: { title: string; items: ReactNode[] }[] = [
  {
    title: "Фреймворк",
    items: [
      <>
        <Tech>Next.js 16</Tech>: App Router, Turbopack, <Code>cacheComponents</Code>,
        partial prefetching.
      </>,
      <>
        <Tech>React 19</Tech> і <Tech>TypeScript</Tech> з типізованими маршрутами (
        <Code>RouteContext</Code>, <Code>LayoutProps</Code>).
      </>,
    ],
  },
  {
    title: "Картографія",
    items: [
      <>
        <Tech>d3-geo</Tech>: проєкція Меркатора, вписана в ширину мапи.
      </>,
      <>
        SVG-контури будуються на сервері (<Code>lib/geometry.ts</Code>), тому GeoJSON і
        більша частина d3 не потрапляють у клієнтський бандл. Клієнт отримує лише
        параметри проєкції й відтворює її (<Code>lib/projection.ts</Code>).
      </>,
      <>
        Траєкторія — дуга великого кола (<Code>geoInterpolate</Code>), відстань —{" "}
        <Code>geoDistance</Code>, коло дальності — <Code>geoCircle</Code>, область під
        точкою визначає <Code>geoContains</Code> на сервері.
      </>,
    ],
  },
  {
    title: "Дані",
    items: [
      <>
        Скрипти <Code>npm run geo:*</Code> на <Tech>mapshaper</Tech> готують GeoJSON
        заздалегідь.
      </>,
      <>Кордони областей — geoBoundaries / OCHA HDX, спрощені до 600 м.</>,
      <>
        Сусідні країни — Natural Earth; для Росії та Білорусі — з областями й
        обласними центрами.
      </>,
      <>Знімок лінії фронту з DeepStateMap, обрізаний по кордону України.</>,
    ],
  },
  {
    title: "Сервер і API",
    items: [
      <>
        <Tech>Route Handlers</Tech>: <Code>POST /launches</Code>,{" "}
        <Code>PUT /speed</Code>, <Code>PATCH /launches/[id]</Code>.
      </>,
      <>
        Сервер — джерело правди: перевіряє дальність і район старту, рахує політ і
        результат.
      </>,
      <>
        Стан у пам&apos;яті, окремо для кожної вкладки: UUID у{" "}
        <Code>sessionStorage</Code>, сесія живе годину.
      </>,
    ],
  },
  {
    title: "Реальний час",
    items: [
      <>
        <Tech>Server-Sent Events</Tech>: сервер раз на секунду шле знімок стану через{" "}
        <Code>ReadableStream</Code>, клієнт слухає <Code>EventSource</Code> з
        автоматичним перепідключенням.
      </>,
      <>
        Між знімками позиція екстраполюється в <Code>requestAnimationFrame</Code> за
        тими самими правилами руху, що й на сервері (<Code>lib/launches.ts</Code>).
      </>,
    ],
  },
  {
    title: "Інтерфейс",
    items: [
      <>
        <Tech>Tailwind CSS 4</Tech>, шрифти <Tech>Geist</Tech> через{" "}
        <Code>next/font</Code> з кирилицею.
      </>,
      <>
        Власні курсори (пускова установка, приціл), ракети повертаються за напрямком
        польоту, таблиця запусків із підсвіткою на мапі.
      </>,
    ],
  },
];

export default function Info() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pt-16 pb-10 text-zinc-300">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Про проєкт
        </h1>
        <p>
          Інтерактивний симулятор запусків ракет на мапі України. Оберіть точку старту
          на підконтрольній території, тип ракети — «Нептун», «Фламінго», «Сапсан» чи
          «Пекло» — і ціль у межах її дальності. Ракета летить найкоротшим шляхом по
          поверхні Землі з реальною швидкістю, яку можна прискорити до ×120, а після
          прильоту показується результат: «Ціль уражено» або «Ракету збито».
        </p>
        <p>
          На мапі — області України, сусідні країни та актуальна лінія фронту за даними
          DeepStateMap. Правила спрощені: області з активними бойовими діями
          враховуються цілком. Проєкт демонстраційний, характеристики ракет —
          орієнтовні.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-zinc-100">Технології</h2>
        {TECH_GROUPS.map(({ title, items }) => (
          <div key={title} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
              {title}
            </h3>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-600">
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <footer className="mt-auto text-xs text-zinc-500">
        Джерела даних:{" "}
        <a
          href="https://www.geoboundaries.org"
          className="underline hover:text-zinc-300"
        >
          geoBoundaries
        </a>{" "}
        /{" "}
        <a
          href="https://data.humdata.org/dataset/cod-ab-ukr"
          className="underline hover:text-zinc-300"
        >
          OCHA HDX
        </a>{" "}
        (CC BY 3.0 IGO),{" "}
        <a
          href="https://www.naturalearthdata.com"
          className="underline hover:text-zinc-300"
        >
          Natural Earth
        </a>
        ,{" "}
        <a
          href="https://deepstatemap.live"
          className="underline hover:text-zinc-300"
        >
          DeepStateMap
        </a>
        .
      </footer>
    </main>
  );
}
