"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { resolveCycle } from "@/lib/data/cycles";
import { yearNavigationHref } from "@/lib/landing/state-query";

export function YearSelect({ cycles }: { cycles: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const urlYear = resolveCycle(cycles, searchParams.get("year") ?? undefined);
  const selected = shown ?? urlYear;
  const highlighted = highlight ?? selected;

  useEffect(() => {
    setShown(null);
  }, [urlYear]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setHighlight(null);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (cycles.length === 0 || selected == null) return null;

  function choose(year: number) {
    setHighlight(null);
    setOpen(false);
    if (year === selected) return;
    setShown(year);
    const href = yearNavigationHref(pathname, window.location.search, year);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setHighlight(selected);
      setOpen(true);
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (highlighted == null) return;
    const index = cycles.indexOf(highlighted);
    if (event.key === "Escape") {
      event.preventDefault();
      setHighlight(null);
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(highlighted);
      return;
    }
    const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = cycles[Math.min(cycles.length - 1, Math.max(0, index + delta))];
    if (next != null) setHighlight(next);
  }

  return (
    <div ref={rootRef} className="relative" data-testid="year-select">
      <button
        type="button"
        id="election-year"
        className="nav-control inline-flex items-center gap-1.5 rounded-lg border border-line bg-card py-2 pr-2.5 pl-2.5 text-sm font-semibold text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Election year"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        <svg
          viewBox="0 0 24 24"
          className="year-affordance h-4 w-4 text-muted"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
        </svg>
        <span className="tabular-nums">{selected}</span>
        <svg viewBox="0 0 20 20" className="year-affordance h-4 w-4 text-muted" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5.5 7.5 10 12l4.5-4.5" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Election year"
          aria-activedescendant={highlighted == null ? undefined : `${listId}-${highlighted}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute right-0 z-40 mt-1 max-h-64 min-w-full overflow-auto rounded-lg border border-line bg-card py-1 shadow-md"
        >
          {cycles.map((year) => {
            const isHighlighted = year === highlighted;
            const isChosen = year === selected;
            return (
              <li key={year} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${year}`}
                  role="option"
                  aria-selected={isChosen}
                  className={
                    isHighlighted
                      ? "flex w-full items-center justify-between gap-3 bg-paper px-3 py-1.5 text-left text-sm font-semibold text-accent"
                      : "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm font-semibold text-ink hover:bg-paper hover:text-accent"
                  }
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => choose(year)}
                >
                  <span className="tabular-nums">{year}</span>
                  {isChosen ? (
                    <span aria-hidden="true" className="text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="w-3" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
