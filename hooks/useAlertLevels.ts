"use client";

import { useEffect, useState } from "react";
import type { AlertSnapshot } from "@/lib/alerts";

export type AlertsState =
  | { status: "loading" }
  | { status: "error" }
  | ({ status: "ready" } & AlertSnapshot);

/** Fetched once per page load; the map doesn't update after that. */
export function useAlertLevels(): AlertsState {
  const [state, setState] = useState<AlertsState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/alerts", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<AlertSnapshot>;
      })
      .then((snapshot) => setState({ status: "ready", ...snapshot }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return state;
}
