"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type TabPanel = { id: string; label: string; panel: ReactNode };

/** ARIA tabs that keep the open tab in the URL (`?tab=` by default) so links and Back work. */
export function Tabs({
  label,
  tabs,
  param = "tab",
  listClass = "tabs",
  aliases,
}: {
  label: string;
  tabs: TabPanel[];
  param?: string;
  listClass?: string;
  /** Old tab ids that shared links may still carry, mapped to the tab that replaced them. */
  aliases?: Record<string, string>;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const sync = () => {
      const raw = new URLSearchParams(location.search).get(param);
      const wanted = raw && aliases?.[raw] ? aliases[raw] : raw;
      setActive(tabs.some((tab) => tab.id === wanted) ? (wanted as string) : (tabs[0]?.id ?? ""));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [tabs, param, aliases]);

  const choose = (id: string, focus = false) => {
    setActive(id);
    const url = new URL(location.href);
    if (id === tabs[0]?.id) url.searchParams.delete(param);
    else url.searchParams.set(param, id);
    history.replaceState(history.state, "", url);
    if (focus) buttons.current[tabs.findIndex((tab) => tab.id === id)]?.focus();
  };

  const onKey = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next = event.key === "ArrowRight" ? (index === last ? 0 : index + 1) : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (next == null) return;
    event.preventDefault();
    choose(tabs[next].id, true);
  };

  return (
    <>
      <div className={listClass} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`pn-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => choose(tab.id)}
            onKeyDown={(event) => onKey(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section key={tab.id} role="tabpanel" id={`pn-${tab.id}`} aria-labelledby={`tab-${tab.id}`} tabIndex={0} hidden={active !== tab.id}>
          {tab.panel}
        </section>
      ))}
    </>
  );
}
