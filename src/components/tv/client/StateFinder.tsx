"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icon";

export type StateRow = { code: string; name: string; href: string; covered: boolean };

function matches(row: StateRow, query: string): boolean {
  if (!query) return true;
  const words = `${row.name} ${row.code}`.toLowerCase();
  return words.split(" ").some((word) => word.startsWith(query)) || words.includes(query);
}

export function StateFinder({ id, rows }: { id: string; rows: StateRow[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = rows.filter((row) => matches(row, q));
  return (
    <div className="sfind">
      <label htmlFor={`${id}-q`} className="lbl-s">
        Search states
      </label>
      <div className="inwrap">
        <Icon name="search" size="sm" />
        <input
          className="input"
          id={`${id}-q`}
          type="search"
          placeholder="Type a state name…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ul className="slist" id={id}>
        {rows.map((row) => (
          <li key={row.code} hidden={!shown.includes(row)}>
            <Link href={row.href}>
              <span className="code">{row.code}</span>
              <span className="nm">{row.name}</span>
              <span className={row.covered ? "st live" : "st"}>{row.covered ? "Covered" : "Coming later"}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="noresult" hidden={shown.length > 0} aria-live="polite">
        No state matches that name.
      </p>
    </div>
  );
}
