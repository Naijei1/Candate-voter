import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/site/CopyText";
import { brand } from "@/content/brand";
import { loadSiteCopy } from "@/lib/content/store";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const copy = await loadSiteCopy();
  return (
    <article className="wrap">
      <h1>About Us</h1>
      <p className="lede">
        {brand.founderName}, {brand.founderRole}.
      </p>
      {copy.founderKey ? <img src="/media/founder" alt="" width={240} height={240} /> : null}
      <h2>Biography</h2>
      <CopyText text={copy.founderBio} />
      <h2>Mission</h2>
      <CopyText text={copy.mission} />
      <h2>Ownership</h2>
      <CopyText text={copy.ownership} />
      <h2>Funding</h2>
      <CopyText text={copy.funding} />
      <h2>Affiliations</h2>
      <CopyText text={copy.affiliations} />
      <h2>Editorial standards</h2>
      <CopyText text={copy.editorialStandards} />
      <h2>Corrections policy</h2>
      <CopyText text={copy.correctionsPolicy} />
      <p>
        <Link href="/contact">Contact</Link>
        {" · "}
        <Link href="/sources">About this data</Link>
      </p>
    </article>
  );
}
