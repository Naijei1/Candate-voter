import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="wrap">
      <h1>Terms</h1>
      <p className="lede">Full terms of use are still being written.</p>
      <p>This site does not tell you how to vote and does not endorse candidates.</p>
      <p>A filing means someone told the election commission they intend to run. It is not the printed ballot.</p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
    </article>
  );
}
