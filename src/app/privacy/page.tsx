import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="wrap">
      <h1>Privacy</h1>
      <p className="lede">A full privacy policy is still being written. Here is what this site does today.</p>
      <ul className="plain-list">
        <li>A ZIP code is used to find U.S. House and Senate races. It is not saved as your home address.</li>
        <li>If a ZIP covers more than one district, a street address is sent once to pick the district. It is not saved.</li>
        <li>After you sign in, saved races stay on your account.</li>
        <li>Campaign filings shown here do not include street addresses.</li>
      </ul>
      <p>
        <Link href="/sources">Where the race data comes from</Link>
      </p>
    </article>
  );
}
