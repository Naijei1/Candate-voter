import type { Metadata } from "next";
import { CopyText } from "@/components/site/CopyText";
import { loadSiteCopy } from "@/lib/content/store";

export const metadata: Metadata = { alternates: { canonical: "/contact" }, title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const copy = await loadSiteCopy();
  return (
    <article className="wrap">
      <h1>Contact</h1>
      {copy.contactMethod ? <CopyText text={copy.contactMethod} /> : null}
      <h2 id="corrections">Corrections</h2>
      {copy.correctionsPolicy ? <CopyText text={copy.correctionsPolicy} /> : null}
      <p>
        Use “Report an error” on a race page.
      </p>
    </article>
  );
}
