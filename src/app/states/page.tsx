import type { Metadata } from "next";
import { StateExplore } from "@/components/site/StateExplore";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";
import { statesWithRaces } from "@/lib/landing";
import { loadPilotIndex } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Explore by state",
};

export default async function StatesPage() {
  const loaded = await loadPilotIndex();
  return (
    <article className="wrap">
      <h1>Explore by state</h1>
      <p>
        Search or choose a state. The map is a second way in, not the only one. Shaded states have
        at least one stored federal filing in the pilot cycle.
      </p>
      <DistrictVintageNote />
      <StateExplore statesWithRaces={statesWithRaces(loaded.races)} />
    </article>
  );
}
