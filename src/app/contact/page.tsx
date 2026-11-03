import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/site/CopyText";
import { loadSiteCopy } from "@/lib/content/store";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const copy = await loadSiteCopy();
  return (
    <article className="wrap">
      <h1>Contact</h1>
      {copy.contactMethod ? (
        <CopyText text={copy.contactMethod} />
      ) : (
        <p className="lede">A public contact method is still being written.</p>
      )}
      <h2 id="corrections">Feedback and corrections</h2>
      {copy.correctionsPolicy ? <CopyText text={copy.correctionsPolicy} /> : null}
      <p>
        On a race page, use Report an error. The note is saved for review and is not published on the race.
      </p>
      <p>
        <Link href="/sources">Where this data comes from</Link>
      </p>
    </article>
  );
}
