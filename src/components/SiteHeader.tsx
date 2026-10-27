import Link from "next/link";
import { Suspense } from "react";
import { AskNav } from "@/components/chat/AskNav";
import { YearSelect } from "@/components/YearSelect";

export function SiteHeader({
  cycles,
  overlay = false,
}: {
  cycles: number[];
  overlay?: boolean;
}) {
  return (
    <header className={overlay ? "map-chrome" : "site-header sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur"}>
      <div className={overlay ? "map-chrome-row" : "flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6"}>
        <Link
          href="/"
          className={
            overlay
              ? "glass-chip brand-link flex min-w-0 items-center gap-2 px-2 py-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              : "brand-link flex min-w-0 items-center gap-3 rounded-lg px-1.5 py-1 text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          }
        >
          <BrandMark />
          <span className="min-w-0">
            <span className="brand-name block text-lg leading-5 font-semibold tracking-tight">Candate</span>
            {overlay ? null : (
              <span className="block truncate text-xs font-medium text-muted">
                Nonpartisan federal races
              </span>
            )}
          </span>
        </Link>
        {overlay ? <div id="map-chrome-info" className="map-chrome-info" /> : null}
        <div className={overlay ? "map-chrome-actions flex items-center gap-2" : "flex items-center gap-2"}>
          <Suspense fallback={<div className="h-10 w-28 rounded-lg border border-line bg-card" aria-hidden="true" />}>
            <YearSelect cycles={cycles} />
          </Suspense>
          <AskNav />
        </div>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v6c0 4.2 2.8 6.8 7 8 4.2-1.2 7-3.8 7-8V6l-7-3Z" />
        <path d="m8.6 12.1 2.3 2.3 4.5-4.8" />
      </svg>
    </span>
  );
}
