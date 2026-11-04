import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="wrap">
      <h1>Terms</h1>
      <p className="lede">How to use this site.</p>
      <p>This site does not tell you how to vote and does not endorse candidates.</p>
      <p>A filing means someone told the election commission they intend to run. It is not the printed ballot.</p>
      <p>
        Google sign-in is optional. If you use it, the email address and name from Google are kept only so you can save races and picks. See the <Link href="/privacy">privacy policy</Link>.
      </p>
      <p>
        Questions and corrections: <Link href="/contact">Contact</Link> and{" "}
        <Link href="/contact#corrections">Feedback and corrections</Link>.
      </p>
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
    </article>
  );
}
