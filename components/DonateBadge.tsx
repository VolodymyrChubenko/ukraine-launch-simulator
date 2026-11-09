"use client";

import { useEffect, useRef, useState } from "react";

// The monobank widget can't be framed (X-Frame-Options: SAMEORIGIN), so the
// QR in public/jar-qr.svg is generated from the jar link itself.
const JAR_URL = "https://send.monobank.ua/jar/2JbpBYkhMv";
const POPOVER_ID = "donate-popover";

type Props = {
  /** While a launch is being set up the badge must not get in the way. */
  disabled: boolean;
};

export function DonateBadge({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Entering launch mode closes the popover without an extra effect.
  const isOpen = open && !disabled;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      inert={disabled}
      className={`absolute right-2 bottom-2 z-5 flex flex-col items-end gap-2 transition-opacity ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {isOpen && (
        <div
          id={POPOVER_ID}
          role="dialog"
          aria-label="Збір на русоріз"
          className="flex w-56 flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 text-sm shadow-xl backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-zinc-100">На русоріз</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрити"
              className="-m-1 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* A QR is useless on the phone you'd scan it with: shown from sm up. */}
          <div className="hidden flex-col items-center gap-1.5 sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element -- static QR */}
            <img
              src="/jar-qr.svg"
              alt="QR-код банки monobank"
              className="size-40 rounded bg-white p-2"
            />
            <span className="text-xs text-zinc-400">
              Відскануйте камерою телефона
            </span>
          </div>

          <a
            href={JAR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-[#fed72e] px-3 py-1.5 text-center font-medium text-zinc-900 transition hover:brightness-110"
          >
            Відкрити банку ↗
          </a>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Підтримати збір «На русоріз»"
        aria-expanded={isOpen}
        aria-controls={POPOVER_ID}
        title="Підтримати збір"
        className="flex flex-col items-center gap-0.5 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-[#fed72e] motion-safe:transition-transform motion-safe:hover:scale-105"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static icon */}
        <img src="/drone.svg" alt="" className="size-8 sm:size-11" />
        <span className="text-[9px] font-bold tracking-wider text-[#fed72e] uppercase sm:text-[10px]">
          На русоріз
        </span>
      </button>
    </div>
  );
}
