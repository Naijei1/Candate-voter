import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { isPostalState, stateName } from "@/lib/data/states";

export const dynamic = "force-dynamic";

const KINDS = [
  { id: "proposition", label: "Proposition" },
  { id: "referendum", label: "Referendum" },
  { id: "retention", label: "Retention question" },
] as const;

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
      <h1>{name} ballot measures</h1>
      <p>
        <StatusMark kind="awaiting" /> No certified question is loaded.
      </p>
      <p>
        {postal === "KY"
          ? "The Kentucky State Board of Elections site did not return a readable file, so these are empty templates."
          : "No official measure list is connected for this state."}
      </p>
      <ul className="card-grid">
        {KINDS.map((kind) => (
          <li className="card" key={kind.id}>
            <h2>{kind.label}</h2>
            <p>Official title: Awaiting content</p>
            <p>Yes / no text: Awaiting content</p>
            <FollowControl what="measure" targetId={`${postal.toLowerCase()}-${kind.id}`} />
            <p>
              <Link href={`/measures/${postal.toLowerCase()}/${kind.id}`}>Open template</Link>
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
