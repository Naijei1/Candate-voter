"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UsMap } from "@/components/UsMap";
import { stateOptions } from "@/lib/data/states";

export function StateExplore({ statesWithRaces }: { statesWithRaces: readonly string[] }) {
  const router = useRouter();
  const states = useMemo(() => stateOptions(), []);
  const [query, setQuery] = useState("");
  const shown = states.filter((state) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return state.name.toLowerCase().includes(q) || state.postal.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="map-panel">
        <UsMap
          mapId="explore-map"
          labelled
          selected={null}
          statesWithRaces={statesWithRaces}
          onSelect={(postal) => router.push(`/states/${postal.toLowerCase()}`)}
          label="Map of the United States. Choose a state."
        />
      </div>
      <p className="hint">
        <Link href="/sources">About this data</Link>
      </p>
      <label htmlFor="state-search">
        Search states
        <input
          id="state-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kentucky"
        />
      </label>
      {shown.length === 0 ? (
        <p role="status">No match.</p>
      ) : (
        <ul className="state-list">
          {shown.map((state) => (
            <li key={state.postal}>
              <Link href={`/states/${state.postal.toLowerCase()}`}>{state.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
