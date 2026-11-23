import Link from "next/link";

export function FeedCorrection({ sourceUrl, candidateId }: { sourceUrl: string; candidateId?: string }) {
  const query = new URLSearchParams({ source: sourceUrl });
  if (candidateId) query.set("candidate", candidateId);
  return <Link className="link-quiet feed-report" href={`/contact?${query}#corrections`}>Report an error</Link>;
}
