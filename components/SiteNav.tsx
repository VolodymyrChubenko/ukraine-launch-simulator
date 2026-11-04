"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// TODO: замінити на адресу портфоліо
const PORTFOLIO_URL = "https://example.com";

const linkCls =
  "pointer-events-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-between p-4">
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Автор"
        className={linkCls}
      >
        <UserIcon />
        <span className="hidden sm:inline">Автор</span>
      </a>
      {pathname === "/info" ? (
        <Link href="/" aria-label="На мапу" className={linkCls}>
          <ArrowLeftIcon />
          <span className="hidden sm:inline">На мапу</span>
        </Link>
      ) : (
        <Link href="/info" aria-label="Про проєкт" className={linkCls}>
          <InfoIcon />
          <span className="hidden sm:inline">Про проєкт</span>
        </Link>
      )}
    </nav>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </Icon>
  );
}

function InfoIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Icon>
  );
}

function ArrowLeftIcon() {
  return (
    <Icon>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Icon>
  );
}
