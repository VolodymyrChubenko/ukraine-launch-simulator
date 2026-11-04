"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "missile-sim:session";

let cached: string | null = null;

/** Per tab: sessionStorage survives a reload but not a new tab. */
function getSessionId(): string {
  if (cached) return cached;
  try {
    cached = sessionStorage.getItem(STORAGE_KEY);
    if (!cached) {
      cached = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, cached);
    }
  } catch {
    // Storage unavailable — the session lasts until the page is closed.
    cached ??= crypto.randomUUID();
  }
  return cached;
}

const subscribe = () => () => {};

/** null during SSR and hydration, the tab's session id afterwards. */
export const useSessionId = () =>
  useSyncExternalStore(subscribe, getSessionId, () => null);
