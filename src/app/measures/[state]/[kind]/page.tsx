import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/site/FollowControl";
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
      <h1>{title}</h1>
      <p>This page will show the official question, a short explanation, and what a yes or no vote means. Nothing is loaded yet.</p>
      <FollowControl what="measure" targetId={`${postal.toLowerCase()}-${kind}`} />
      <p>
        <Link className="btn btn-navy" href={`/states/${postal.toLowerCase()}`}>
          Back to {stateName(postal)} races
        </Link>
      </p>
    </article>
  );
}
