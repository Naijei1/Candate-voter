import type { Metadata } from "next";
import { Crumbs, ScopeNav } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { StateExplorer } from "@/components/tv/StateExplorer";
import { enabledStates } from "@/lib/states";

export const metadata: Metadata = { alternates: { canonical: "/states" }, title: "Explore by state" };

export default function StatesPage() {
  const covered = enabledStates().map((state) => state.name);
  return (
    <>
      <ScopeNav current="states" />
      <div className="wrap">
        <Crumbs items={[{ href: "/", label: "Home" }, { label: "Explore by state" }]} />
        <h1 className="t-h1 pt">Explore by state</h1>
        <p className="lede">{covered.join(" and ")} is covered now. Other states are coming later and show no candidate data yet.</p>
        <StateExplorer
          id="statelist"
          big
          note={
            <p className="src">
              Source:{" "}
              <ExtLink className="xl" href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" icon>
                U.S. Census Bureau, state boundaries
              </ExtLink>
            </p>
          }
        />
      </div>
    </>
  );
}
