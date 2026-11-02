import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { isPostalState, stateName } from "@/lib/data/states";

export const dynamic = "force-dynamic";

const KINDS = {
  proposition: "Proposition",
  referendum: "Referendum",
  retention: "Retention question",
} as const;

type PageProps = { params: Promise<{ state: string; kind: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const kind = (await params).kind;
  return { title: kind in KINDS ? KINDS[kind as keyof typeof KINDS] : "Measure" };
}

export default async function MeasureTemplatePage({ params }: PageProps) {
  const { state, kind } = await params;
  const postal = state.trim().toUpperCase();
  if (!isPostalState(postal) || !(kind in KINDS)) notFound();
  const title = KINDS[kind as keyof typeof KINDS];
  return (
    <article className="wrap">
      <p>
        <Link href={`/measures/${postal.toLowerCase()}`}>{stateName(postal)} measures</Link>
      </p>
      <p>
        <StatusMark kind="awaiting" /> Template. Not a certified question.
      </p>
      <h1>{title}</h1>
      <FollowControl what="measure" targetId={`${postal.toLowerCase()}-${kind}`} />
      <ul className="plain-list">
        <li>Official title: Awaiting content</li>
        <li>Plain-language summary: Awaiting content</li>
        <li>Yes: Awaiting content</li>
        <li>No: Awaiting content</li>
        <li>Fiscal note: Awaiting content</li>
        <li>Source: Awaiting content</li>
      </ul>
    </article>
  );
}
