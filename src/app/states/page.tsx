import type { Metadata } from "next";
import { StateExplore } from "@/components/site/StateExplore";
import { statesWithRaces } from "@/lib/landing";
import { loadPilotIndex } from "@/lib/site/contest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = { title: "Explore by state" };

export default async function StatesPage() {
  const loaded = await loadPilotIndex();
  return (
    <article className="wrap">
      <h1>Explore by state</h1>
      <StateExplore statesWithRaces={statesWithRaces(loaded.races)} />
    </article>
  );
}
