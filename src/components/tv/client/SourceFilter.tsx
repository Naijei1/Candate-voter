"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Filters `[data-s]` rows inside by the search box in the same block. */
export function SourceFilter({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    const input = root?.querySelector<HTMLInputElement>("input[type=search]");
    if (!root || !input) return;
    const run = () => {
      const q = input.value.trim().toLowerCase();
      root.querySelectorAll<HTMLElement>("[data-s]").forEach((row) => {
        row.hidden = Boolean(q) && !(row.dataset.s ?? "").includes(q);
      });
      root.querySelectorAll<HTMLElement>("[data-sgroup]").forEach((group) => {
        group.hidden = ![...group.querySelectorAll<HTMLElement>("[data-s]")].some((row) => !row.hidden);
      });
    };
    input.addEventListener("input", run);
    return () => input.removeEventListener("input", run);
  }, []);
  return <div ref={box}>{children}</div>;
}
