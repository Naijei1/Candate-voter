import type { Metadata } from "next";
import Link from "next/link";
import { PILOT_YEAR } from "@/lib/site/contest";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p>
        A candidate here is someone with a filing for a contest, not the person who currently holds
        the office. Officeholders have a separate directory.
      </p>
      <p>
        <Link href="/officeholders">Officeholder directory</Link>
      </p>
      <p>
        The pilot roster is Kentucky’s {PILOT_YEAR} federal contests. Open a contest to see the
        names stored from FEC Form 2 filings.
      </p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          Kentucky {PILOT_YEAR} contests
        </Link>
      </p>
      <p>
        <Link href="/states">Choose another state</Link>
      </p>
    </article>
  );
}
