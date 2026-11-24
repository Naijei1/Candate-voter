import { Suspense } from "react";
import { GuideFlow } from "@/components/guide/GuideFlow";
import { HowToVote } from "@/components/site/HowToVote";
import { currentUser } from "@/lib/auth/session";
import { guideRaces } from "@/lib/site/guide-races";

export const metadata = { alternates: { canonical: "/ballot" } };

export const dynamic = "force-dynamic";

export default async function BallotPage() {
  const user = await currentUser();
  return (
    <div className="wrap ballot-page">
      <HowToVote />
      <Suspense fallback={<p>Loading your ballot…</p>}>
        <GuideFlow races={guideRaces()} signedIn={user != null} />
      </Suspense>
    </div>
  );
}
