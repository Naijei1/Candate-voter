"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UsMap } from "@/components/UsMap";
import { stateOptions } from "@/lib/data/states";

export function StateExplore({
  statesWithRaces,
  showMap = true,
}: {
  statesWithRaces: readonly string[];
  showMap?: boolean;
}) {
  const router = useRouter();
  const states = useMemo(() => stateOptions(), []);
  const [query, setQuery] = useState("");
  const shown = states.filter((state) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return state.name.toLowerCase().includes(q) || state.postal.toLowerCase().includes(q);
  });

  return (
    <div className="section">
      {showMap ? (
        <div className="map-panel">
          <UsMap
            mapId="explore-map"
            labelled
            selected={null}
            statesWithRaces={statesWithRaces}
            onSelect={(postal) => router.push(`/states/${postal.toLowerCase()}`)}
            label="Map of the United States. Choose a state to open its contests. Shapes are state outlines, not House districts."
          />
          <p>
            State outlines are for navigation. House district lines, on a state page, come from the
            Census 119th Congress file. ZIP lookup uses the Census current congressional layer
            (120th Congress). Those vintages can differ. The map is not the only way in.
          </p>
        </div>
      ) : null}
      <label htmlFor="state-search">
        Search states
        <input
          id="state-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kentucky or KY"
        />
      </label>
      {shown.length === 0 ? (
        <p role="status">No states match that search.</p>
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
