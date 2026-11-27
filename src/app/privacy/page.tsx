import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs } from "@/components/tv/bits";

export const metadata: Metadata = { alternates: { canonical: "/privacy" }, title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="wrap prose">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Privacy" }]} />
      <h1 className="t-h1 pt">Privacy</h1>
      <h2 className="sec-t">Saved on this device</h2>
      <ul className="checks">
        <li>Your county, the races you follow and your alert choices stay in this browser. Nothing is sent to us.</li>
        <li>We never ask for your address.</li>
        <li>Campaign filings shown here do not include street addresses.</li>
        <li>We never sell personal information or use it for advertising.</li>
      </ul>
      <h2 className="sec-t">Site use</h2>
      <ul className="checks">
        <li>GoatCounter counts page views without cookies.</li>
        <li>Ask answers from this site’s records. We don’t store the question text.</li>
        <li>Error reports go to private review with the page they came from.</li>
      </ul>
      <h2 className="sec-t">Contact</h2>
      <p>
        See <Link href="/contact">Contact</Link> for questions.
      </p>
    </div>
  );
}
