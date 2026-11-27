"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type TabPanel = { id: string; label: string; panel: ReactNode };

/** ARIA tabs that keep the open tab in `?tab=` so links and Back work. */
export function Tabs({ label, tabs }: { label: string; tabs: TabPanel[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const sync = () => {
      const wanted = new URLSearchParams(location.search).get("tab");
      setActive(tabs.some((tab) => tab.id === wanted) ? (wanted as string) : (tabs[0]?.id ?? ""));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [tabs]);

  const choose = (id: string, focus = false) => {
    setActive(id);
    const url = new URL(location.href);
    if (id === tabs[0]?.id) url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
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
      <div className="tabs" role="tablist" aria-label={label}>
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
