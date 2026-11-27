import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { stateConfig } from "@/lib/states";

export const metadata: Metadata = { alternates: { canonical: "/terms" }, title: "Terms" };

export default function TermsPage() {
  const state = stateConfig();
  return (
    <div className="wrap prose">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Terms" }]} />
      <h1 className="t-h1 pt">Terms</h1>
      <p>THE VOTE uses public sources linked on each page and does not endorse candidates.</p>
      <p>
        Check official results with the <ExtLink href={state.results.official.href}>{state.results.sourceName}</ExtLink>.
      </p>
      <p>
        See the <Link href="/privacy">privacy policy</Link>.
      </p>
      <p>
        <Link href="/contact">Contact</Link> · <Link href="/contact#corrections">Corrections</Link>
      </p>
    </div>
  );
}
