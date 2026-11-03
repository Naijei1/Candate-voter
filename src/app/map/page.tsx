import type { Metadata } from "next";
import { DistrictMap } from "@/components/DistrictMap";
import { kyBallotSeed } from "@/lib/site/ky-ballot";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  const races = kyBallotSeed().races.filter((race) => race.office === "house");
  return (
    <article className="wrap">
      <h1>Kentucky map</h1>
      <p className="lede">Tap a number to open that U.S. House race. No ZIP required.</p>
      <DistrictMap postal="KY" races={races} year={2026} />
    </article>
  );
}
