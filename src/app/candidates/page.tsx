import type { Metadata } from "next";
import Link from "next/link";
import { PILOT_YEAR } from "@/lib/site/contest";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p className="lede">People who have filed to run. This is not a list of who holds office now.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky {PILOT_YEAR}
        </Link>
      </p>
      <p>
        <Link href="/officeholders">Who holds office now</Link> is not loaded yet.
      </p>
    </article>
  );
}
