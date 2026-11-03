import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/site/CopyText";
import { brand } from "@/content/brand";
import { COPY_FIELDS, COPY_LABELS } from "@/lib/content/copy";
import { loadSiteCopy } from "@/lib/content/store";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const copy = await loadSiteCopy();
  const written = COPY_FIELDS.filter((field) => copy[field]);
  return (
    <article className="wrap">
      <h1>About Us</h1>
      <p className="lede">
        {brand.founderName} is the {brand.founderRole.toLowerCase()} of {brand.name}.
      </p>
      {copy.founderKey ? <img src="/media/founder" alt="" width={240} height={240} /> : null}
      {written.length === 0 ? (
        <p>A biography, mission, and funding details are still being written. You can look up races now.</p>
      ) : (
        written.map((field) => (
          <section key={field}>
            <h2>{COPY_LABELS[field]}</h2>
            <CopyText text={copy[field]} />
          </section>
        ))
      )}
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
      <p>
        <Link href="/sources">Where the data comes from</Link>
      </p>
    </article>
  );
}
