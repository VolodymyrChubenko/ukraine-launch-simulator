import type { AlertsState } from "@/hooks/useAlertLevels";
import { ALERT_FILL, NO_ALERT_FILL } from "@/lib/alerts";

const ITEMS = [
  { fill: ALERT_FILL.red, label: "Повітряна тривога" },
  { fill: ALERT_FILL.yellow, label: "Попередня загроза" },
  { fill: NO_ALERT_FILL, label: "Немає тривоги" },
];

const timeFormat = new Intl.DateTimeFormat("uk-UA", {
  timeStyle: "short",
  timeZone: "Europe/Kyiv",
});

export function AlertLegend({ alerts }: { alerts: AlertsState }) {
  // Without this message grey regions would read as "no alert".
  if (alerts.status === "error") {
    return (
      <p role="status" className="text-xs text-zinc-400">
        Дані про тривоги недоступні
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs text-zinc-400">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {ITEMS.map(({ fill, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-sm"
              style={{ backgroundColor: fill }}
            />
            {label}
          </li>
        ))}
      </ul>
      <p className="text-zinc-500">
        {alerts.status === "ready"
          ? `Область зафарбована, якщо тривога є хоча б у її частині · станом на ${timeFormat.format(new Date(alerts.fetchedAt))}`
          : "Завантаження даних про тривоги…"}
      </p>
    </div>
  );
}
