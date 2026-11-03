import { Suspense } from "react";
import { ElectionDayBanner } from "@/components/site/ElectionDayBanner";
import { BallotHub } from "@/components/site/BallotHub";
import { ballotCards } from "@/lib/site/ky-ballot";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <article className="wrap">
      <h1>Your ballot</h1>
      <p className="lede">Kentucky, November 3, 2026. Enter a ZIP or tap the map.</p>
      <ElectionDayBanner />
      <Suspense fallback={<p>Loading your ballot…</p>}>
        <BallotHub cards={ballotCards()} />
      </Suspense>
    </article>
  );
}
