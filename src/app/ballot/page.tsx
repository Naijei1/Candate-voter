import { Suspense } from "react";
import { GuideFlow } from "@/components/guide/GuideFlow";
import { currentUser } from "@/lib/auth/session";
import { guideRaces } from "@/lib/site/guide-races";

export const dynamic = "force-dynamic";

export default async function BallotPage() {
  const user = await currentUser();
  return (
    <div className="wrap ballot-page">
      <Suspense fallback={<p>Loading your ballot…</p>}>
        <GuideFlow races={guideRaces()} signedIn={user != null} />
      </Suspense>
    </div>
  );
}
