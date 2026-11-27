import Link from "next/link";
import { stateOptions } from "@/lib/data/states";
import { STATE_TILES } from "@/lib/geo/state-tiles";
import { enabledStates } from "@/lib/states";
import { StateFinder, type StateRow } from "./client/StateFinder";

export function stateRows(): StateRow[] {
  const covered = new Set<string>(enabledStates().map((state) => state.code));
  const rows = stateOptions()
    .filter((option) => option.postal in STATE_TILES)
    .map((option) => ({
      code: option.postal,
      name: option.name,
      href: `/states/${option.postal.toLowerCase()}`,
      covered: covered.has(option.postal),
    }));
  return [...rows.filter((row) => row.covered), ...rows.filter((row) => !row.covered)];
}

export function TileMap({ rows }: { rows: StateRow[] }) {
  return (
    <div className="tmap">
      <div className="tgrid" role="group" aria-label="United States, one tile per state">
        {rows
          .slice()
          .sort((a, b) => STATE_TILES[a.code][0] - STATE_TILES[b.code][0] || STATE_TILES[a.code][1] - STATE_TILES[b.code][1])
          .map((row) => (
            <Link key={row.code} className={row.covered ? "stile live" : "stile"} href={row.href} style={{ gridRow: STATE_TILES[row.code][0], gridColumn: STATE_TILES[row.code][1] }} title={row.name}>
              {row.code}
              <span className="sr">{`, ${row.name}, ${row.covered ? "covered" : "coming later"}`}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}

export function StateExplorer({ id, big, note }: { id: string; big?: boolean; note?: React.ReactNode }) {
  const rows = stateRows();
  const finder = (
    <div>
      <StateFinder id={id} rows={rows} />
      {note}
    </div>
  );
  return (
    <div className={big ? "explore-g big" : "explore-g"}>
      {big ? finder : null}
      <div>
        <TileMap rows={rows} />
        <div className="legend">
          <span>
            <i className="sw live" />
            Covered
          </span>
          <span>
            <i className="sw" />
            Coming later
          </span>
        </div>
      </div>
      {big ? null : finder}
    </div>
  );
}
