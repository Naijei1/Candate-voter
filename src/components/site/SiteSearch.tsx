"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { withBasePath } from "@/lib/base-path";

export function SiteSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  function open() {
    dialog.current?.showModal();
    dialog.current?.querySelector("input")?.focus();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const chord = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!slash && !chord) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (dialog.current?.open) return;
      event.preventDefault();
      open();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a href={withBasePath("/search")} onClick={(event) => { event.preventDefault(); open(); }}>Search</a>
      {mounted ? createPortal(
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-labelledby="site-search-title"
        onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}
      >
        <form method="get" action={withBasePath("/search")}>
          <h2 id="site-search-title">Search</h2>
          <label htmlFor="site-q">Candidates, races, and counties</label>
          <input id="site-q" name="q" type="search" autoComplete="off" />
          <div className="actions">
            <button className="btn btn-navy" type="submit">Search</button>
            <button className="btn btn-ghost" type="button" onClick={() => dialog.current?.close()}>Close</button>
          </div>
        </form>
      </dialog>,
      document.body,
      ) : null}
    </>
  );
}
