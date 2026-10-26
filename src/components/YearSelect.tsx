"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveCycle } from "@/lib/data/cycles";

export function YearSelect({ cycles }: { cycles: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (cycles.length === 0) return null;

  const selected = resolveCycle(cycles, searchParams.get("year") ?? undefined);

  function onChange(value: string) {
    const params = new URLSearchParams(
      typeof window === "undefined" ? searchParams.toString() : window.location.search,
    );
    params.set("year", value);
    const query = params.toString();
    if (pathname === "/") {
      router.push(query ? `/?${query}` : "/");
      return;
    }
    router.push(`/?year=${encodeURIComponent(value)}`);
  }

  return (
    <div className="relative">
      <label htmlFor="election-year" className="sr-only">
        Election year
      </label>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
      </svg>
      <select
        id="election-year"
        value={selected ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-lg border border-line bg-card py-2 pr-8 pl-8 text-sm font-semibold text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {cycles.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </div>
  );
}
