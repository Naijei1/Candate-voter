import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { alternates: { canonical: "/terms" }, title: "Terms" };

export default function TermsPage() {
  return (
    <article className="wrap">
      <h1>Terms</h1>
      <p>THE VOTE uses public sources linked on each page and does not endorse candidates.</p>
      <p>Check official results with the <a href="https://elect.ky.gov">Kentucky State Board of Elections</a>.</p>
      <p>
        Google sign-in lets you save races and picks. See the <Link href="/privacy">privacy policy</Link>.
      </p>
      <p>
        <Link href="/contact">Contact</Link> · <Link href="/contact#corrections">Corrections</Link>
      </p>
    </article>
  );
}
