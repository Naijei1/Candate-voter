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
      <CopyText text={copy.contactMethod} />
      <h2 id="corrections">Feedback and corrections</h2>
      <CopyText text={copy.correctionsPolicy} />
      <p>
        Race pages include a report control. A saved note is stored for review and is not
        published on the race page. <Link href="/sources">How records are sourced</Link>
      </p>
    </article>
  );
}
