import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="wrap">
      <h1>Privacy</h1>
      <h2>Google sign-in</h2>
      <p>
        We use your Google name and email to keep your saved races and picks. We never sell personal information or use it for advertising.
      </p>
      <h2>Finding a race</h2>
      <ul className="plain-list">
        <li>Your ZIP code finds your U.S. House and Senate races.</li>
        <li>For ZIP codes that span districts, we use your address once without saving it.</li>
        <li>Campaign filings shown here do not include street addresses.</li>
      </ul>
      <h2>Contact</h2>
      <p>
        See <Link href="/contact">Contact</Link> for questions. Race-page corrections go to private review.
      </p>
    </article>
  );
}
