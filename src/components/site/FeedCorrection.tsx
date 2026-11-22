import Link from "next/link";

export function FeedCorrection({ sourceUrl, candidateId }: { sourceUrl: string; candidateId?: string }) {
  const query = new URLSearchParams({ source: sourceUrl });
  if (candidateId) query.set("candidate", candidateId);
  return <Link className="section-more inline-flex min-h-11 items-center" href={`/contact?${query}#corrections`}>Report an error</Link>;
}
