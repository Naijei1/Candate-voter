import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="wrap">
      <h1>Terms</h1>
      <p>A filing means someone told the election commission they intend to run. It is not the printed ballot.</p>
      <p>
        Google sign-in lets you save races and picks. See the <Link href="/privacy">privacy policy</Link>.
      </p>
      <p>
        <Link href="/contact">Contact</Link> · <Link href="/contact#corrections">Corrections</Link>
      </p>
    </article>
  );
}
