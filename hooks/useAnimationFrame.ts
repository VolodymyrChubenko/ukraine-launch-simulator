"use client";

import { useEffect, useState } from "react";

/**
 * Current time, updated every animation frame while `active`. Starts at 0:
 * reading the clock during render would break prerendering.
 */
export function useAnimationFrame(active: boolean): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = requestAnimationFrame(function loop() {
      setNow(Date.now());
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return now;
}
