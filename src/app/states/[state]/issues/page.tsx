import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowControl } from "@/components/site/FollowControl";
import { StatusMark } from "@/components/site/StatusMark";
import { isPostalState, stateName } from "@/lib/data/states";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const postal = (await params).state.trim().toUpperCase();
  return { title: isPostalState(postal) ? `${stateName(postal)} issues` : "Issues" };
}

export default async function IssuesPage({ params }: PageProps) {
  const postal = (await params).state.trim().toUpperCase();
  if (!isPostalState(postal)) notFound();
  return (
    <article className="wrap">
      <p>
        <Link href={`/states/${postal.toLowerCase()}`}>{stateName(postal)}</Link>
      </p>
      <h1>Issues</h1>
      <p>
        <StatusMark kind="awaiting" /> No issue list is loaded.
      </p>
      <FollowControl what="issue" targetId={postal} />
    </article>
  );
}
