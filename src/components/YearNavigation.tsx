"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";
import { yearNavigationHref } from "@/lib/landing/state-query";

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

  const clearPendingYear = useCallback(() => {
    setPendingYear(null);
  }, []);

  const chooseYear = useCallback(
    (year: number, pathname: string) => {
      const href = yearNavigationHref(pathname, window.location.search, year);
      const currentYear = new URLSearchParams(window.location.search).get("year");
      if (pathname === "/" && currentYear === String(year)) {
        setPendingYear(null);
        return;
      }
      setPendingYear(year);
      router.push(href, { scroll: false });
      window.setTimeout(() => {
        const landed = new URLSearchParams(window.location.search).get("year");
        if (landed === String(year)) return;
        window.location.assign(withBasePath(href));
      }, 400);
    },
    [router],
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
