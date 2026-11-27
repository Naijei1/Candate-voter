import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/tv/bits";

export const metadata: Metadata = { alternates: { canonical: "/privacy" }, title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="wrap prose">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Privacy" }]} />
      <h1 className="t-h1 pt">Privacy</h1>
      <ul className="checks">
        <li>Your county, follows and alert choices stay in this browser.</li>
        <li>We never ask for your address and never sell personal information or use it for advertising.</li>
        <li>GoatCounter counts page views without cookies.</li>
        <li>Ask answers from our records and does not store your question.</li>
        <li>Error reports go to private review.</li>
      </ul>
      <h2 className="sec-t">Contact</h2>
      <p>
        See <Link href="/contact">Contact</Link> for questions.
      </p>
    </div>
  );
}
