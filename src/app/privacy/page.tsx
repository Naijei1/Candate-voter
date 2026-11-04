import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="wrap">
      <h1>Privacy</h1>
      <p className="lede">What this site keeps, and what it does not.</p>
      <h2>Google sign-in</h2>
      <p>
        If you continue with Google, we store the email address and name Google sends. We use them only to keep the races and picks you save on your account. We do not sell personal information, and we do not use it for advertising.
      </p>
      <h2>Finding a race</h2>
      <ul className="plain-list">
        <li>A ZIP code is used to find U.S. House and Senate races. It is not saved as your home address.</li>
        <li>If a ZIP covers more than one district, a street address is sent once to pick the district. It is not saved.</li>
        <li>Campaign filings shown here do not include street addresses.</li>
      </ul>
      <h2>Contact</h2>
      <p>
        Questions and corrections go through <Link href="/contact">Contact</Link> and{" "}
        <Link href="/contact#corrections">Feedback and corrections</Link>. On a race page, Report an error saves a note for review. It is not published on the race.
      </p>
      <p>
        <Link href="/sources">Where the race data comes from</Link>
      </p>
    </article>
  );
}
