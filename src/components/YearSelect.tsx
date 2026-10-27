"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useYearNavigation } from "@/components/YearNavigation";
import { resolveCycle } from "@/lib/data/cycles";

type MenuBox = { top: number; right: number; maxHeight: number };

export function YearSelect({ cycles }: { cycles: number[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pendingYear, chooseYear } = useYearNavigation();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [box, setBox] = useState<MenuBox | null>(null);
  const urlYear = resolveCycle(cycles, searchParams.get("year") ?? undefined);
  const selected = pendingYear ?? urlYear;
  const highlighted = highlight ?? selected;

  function place() {
    const button = rootRef.current?.querySelector("button");
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    setBox({
      top: rect.bottom + 4,
      right: Math.max(margin, window.innerWidth - rect.right),
      maxHeight: Math.max(160, window.innerHeight - rect.bottom - margin * 2),
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    listRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setHighlight(null);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (cycles.length === 0 || selected == null) return null;

  function choose(year: number) {
    setHighlight(null);
    setOpen(false);
    if (year === selected) return;
    chooseYear(year, pathname);
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      place();
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

  const menu =
    open && box && typeof document !== "undefined" ? (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Election year"
        aria-activedescendant={highlighted == null ? undefined : `${listId}-${highlighted}`}
        tabIndex={-1}
        onKeyDown={onListKeyDown}
        className="year-menu max-h-64 min-w-36 overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-card py-1 shadow-md"
        style={{ position: "fixed", top: box.top, right: box.right, maxHeight: box.maxHeight, zIndex: 80 }}
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
                    ? "flex min-h-11 w-full items-center justify-between gap-3 bg-paper px-3 py-2 text-left text-sm font-semibold text-accent"
                    : "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-paper hover:text-accent"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
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
    ) : null;

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
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          place();
          setHighlight(selected);
          setOpen(true);
        }}
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
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
