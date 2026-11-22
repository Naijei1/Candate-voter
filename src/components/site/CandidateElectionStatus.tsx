import type { ElectionStatus } from "@/lib/site/certified-results";

export function CandidateElectionStatus({ status }: { status?: ElectionStatus }) {
  if (!status?.elected && !status?.primary) return null;
  return (
    <>
      {status.elected ? <span className="cand-status is-incumbent">Elected</span> : null}
      {status.primary ? <span className="cand-status">{status.primary === "won" ? "Won" : "Lost"} the May 19 primary</span> : null}
    </>
  );
}
