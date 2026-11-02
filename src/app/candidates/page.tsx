import type { Metadata } from "next";
import Link from "next/link";
import { StatusMark } from "@/components/site/StatusMark";
import { PILOT_YEAR } from "@/lib/site/contest";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return (
    <article className="wrap">
      <h1>Candidates</h1>
      <p className="lede">People who have filed, not current officeholders.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          Kentucky {PILOT_YEAR}
        </Link>
      </p>
      <p>
        <Link href="/officeholders">Officeholders</Link> <StatusMark kind="gap" />
      </p>
    </article>
  );
}
