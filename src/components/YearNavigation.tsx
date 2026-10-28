"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";
import { yearChoiceAction, yearNavigationHref } from "@/lib/landing/state-query";

/** Soft navigation that has not landed by then is replaced with a full load. */
const YEAR_RELOAD_MS = 1_500;

type YearNav = {
  /** Year the visitor picked, until that year's races are on the page. */
  pendingYear: number | null;
  chooseYear: (year: number, pathname: string) => void;
  clearPendingYear: () => void;
};

const YearNavContext = createContext<YearNav | null>(null);

/**
 * One year choice for the header and the map. The label can move immediately.
 * The map stays on a loading shell until the page year matches, so a click
 * cannot leave "2028" on 2026 races.
 */
export function YearNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const watchdog = useRef<number | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdog.current != null) {
      window.clearTimeout(watchdog.current);
      watchdog.current = null;
    }
  }, []);

  const clearPendingYear = useCallback(() => {
    clearWatchdog();
    setPendingYear(null);
  }, [clearWatchdog]);

  const armWatchdog = useCallback(
    (href: string) => {
      clearWatchdog();
      watchdog.current = window.setTimeout(() => {
        window.location.assign(withBasePath(href));
      }, YEAR_RELOAD_MS);
    },
    [clearWatchdog],
  );

  useEffect(() => clearWatchdog, [clearWatchdog]);

  const chooseYear = useCallback(
    (year: number, pathname: string) => {
      const href = yearNavigationHref(pathname, window.location.search, year);
      const action = yearChoiceAction(pathname, window.location.search, year, pendingYear);
      if (action === "stay") {
        clearPendingYear();
        return;
      }
      if (action === "reload") {
        window.location.assign(withBasePath(href));
        return;
      }
      setPendingYear(year);
      router.push(href, { scroll: false });
      armWatchdog(href);
    },
    [armWatchdog, clearPendingYear, pendingYear, router],
  );

  return (
    <YearNavContext.Provider value={{ pendingYear, chooseYear, clearPendingYear }}>
      {children}
    </YearNavContext.Provider>
  );
}

/** No-op outside the frame so a page rendered alone still mounts. */
export function useYearNavigation(): YearNav {
  return (
    useContext(YearNavContext) ?? {
      pendingYear: null,
      chooseYear: () => {},
      clearPendingYear: () => {},
    }
  );
}
