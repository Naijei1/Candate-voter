import type { Metadata } from "next";
import { CorrectionForm } from "@/components/site/CorrectionForm";
import { httpsUrl } from "@/lib/format";
import { CopyText } from "@/components/site/CopyText";
import { loadSiteCopy } from "@/lib/content/store";

export const metadata: Metadata = { alternates: { canonical: "/contact" }, title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ source?: string; candidate?: string }> }) {
  const query = await searchParams;
  const source = typeof query.source === "string" && query.source.length <= 500 ? httpsUrl(query.source) : null;
  const copy = await loadSiteCopy();
  return (
    <article className="wrap">
      <h1>Contact</h1>
      {copy.contactMethod ? <CopyText text={copy.contactMethod} /> : null}
      <h2 id="corrections">Corrections</h2>
      {copy.correctionsPolicy ? <CopyText text={copy.correctionsPolicy} /> : null}
      {source ? <p><a href={source}>Record you’re reporting</a></p> : null}
      <CorrectionForm source={source} candidateId={typeof query.candidate === "string" ? query.candidate : undefined} />
    </article>
  );
}
