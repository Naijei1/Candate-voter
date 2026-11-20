import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPostalState, stateName } from "@/lib/data/states";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const postal = (await params).state.trim().toUpperCase();
  return { title: isPostalState(postal) ? `${stateName(postal)} measures` : "Measures" };
}

export default async function MeasuresPage({ params }: PageProps) {
  const postal = (await params).state.trim().toUpperCase();
  if (!isPostalState(postal)) notFound();
  const name = stateName(postal);
  return (
    <article className="wrap">
      <h1>{name} ballot questions</h1>
      <p>No ballot questions listed.</p>
    </article>
  );
}
