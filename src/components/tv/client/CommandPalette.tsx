"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { looksLikeQuestion, searchIndex, type IndexEntry } from "@/lib/tv/index-search";
import { Icon } from "../Icon";

type Row = IndexEntry | { g: "Ask"; t: string; s: string; h: string; i: "ask" };

export function SearchButton() {
  return (
    <button className="icon-btn" type="button" aria-label="Search" onClick={() => window.dispatchEvent(new Event("tv:search"))}>
      <Icon name="search" />
    </button>
  );
}

export function CommandPalette({ index }: { index: IndexEntry[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const rows = useMemo<Row[]>(() => {
    const raw = query.trim();
    const shown: Row[] = raw
      ? searchIndex(index, raw)
      : [...index.filter((entry) => entry.g === "Pages").slice(0, 6), ...index.filter((entry) => entry.g === "Races")];
    if (raw) {
      const ask: Row = { g: "Ask", t: `Ask: “${raw}”`, s: "Answer with sources", h: `/ask?q=${encodeURIComponent(raw)}`, i: "ask" };
      if (looksLikeQuestion(raw)) shown.unshift(ask);
      else shown.push(ask);
    }
    return shown;
  }, [index, query]);

  useEffect(() => {
    const open = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (dialog.open) {
        dialog.close();
        return;
      }
      setQuery("");
      setSelected(0);
      dialog.showModal();
      inputRef.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? "");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("tv:search", open);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("tv:search", open);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (href: string) => {
    dialogRef.current?.close();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => (rows.length ? (value + 1) % rows.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => (rows.length ? (value - 1 + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[selected];
      if (row) go(row.h);
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  let group = "";
  return (
    <dialog
      className="cmdk"
      ref={dialogRef}
      aria-label="Search"
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="ck-in">
        <Icon name="search" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Name, district, state or a question…"
          aria-label="Search"
          aria-controls="ck-list"
          aria-activedescendant={rows[selected] ? `ck-${selected}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button className="icon-btn" type="button" aria-label="Close search" onClick={() => dialogRef.current?.close()}>
          <Icon name="close" />
        </button>
      </div>
      <div className="ck-list" id="ck-list" role="listbox" aria-label="Results">
        {rows.map((row, n) => {
          const heading = row.g !== group ? row.g : null;
          group = row.g;
          return (
            <div key={`${row.h}-${n}`} role="presentation">
              {heading ? (
                <div className="ck-g" role="presentation">
                  {heading}
                </div>
              ) : null}
              <a
                className="ck-i"
                role="option"
                id={`ck-${n}`}
                href={row.h}
                aria-selected={n === selected}
                onClick={(event) => {
                  event.preventDefault();
                  go(row.h);
                }}
              >
                {"img" in row && row.img !== undefined ? (
                  <span className="face">{row.img ? <img src={row.img} alt="" width={32} height={32} /> : null}</span>
                ) : (
                  <span className="ai">
                    <Icon name={("i" in row && row.i) || "info"} size="sm" />
                  </span>
                )}
                <span>{row.t}</span>
                <span className="sub">{row.s}</span>
              </a>
            </div>
          );
        })}
      </div>
    </dialog>
  );
}
