// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { formatInstant, instantDateTime } from "@/lib/format";
import type { StateScoreboard as Scoreboard } from "@/lib/landing";

export function WhatAmILookingAt({ refreshedAt }: { refreshedAt?: string | null }) {
  const refreshed = formatInstant(refreshedAt);
  const dateTime = instantDateTime(refreshedAt);
  return (
    <details data-testid="looking-at" className="mt-3">
      <summary className="inline-flex cursor-pointer list-none rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        What am I looking at?
      </summary>
      <div className="mt-2 rounded-lg border border-line bg-card p-3 text-sm leading-5 text-ink">
        <p>Form 2 filings are not the ballot.</p>
        <p className="mt-1">These are candidates so far, not the final list.</p>
        <p className="mt-1">
          Sources are public FEC records.{" "}
          {refreshed ? (
            <>
              Last refresh{" "}
              {dateTime ? <time dateTime={dateTime}>{refreshed}</time> : refreshed}.
            </>
          ) : (
            "A refresh time isn't stored yet."
          )}
        </p>
      </div>
    </details>
  );
}

export function StateScoreboard({ board }: { board: Scoreboard }) {
  const house =
    board.districtsTotal > 0
      ? `${board.districtsWithFilings} of ${board.districtsTotal}`
      : String(board.districtsWithFilings);
  return (
    <dl data-testid="state-scoreboard" className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-line bg-card px-3 py-2">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Senate</dt>
        <dd className="text-2xl font-semibold tabular-nums text-ink">{board.senateFilings}</dd>
        <p className="text-xs text-muted">{board.filingsSoFarOnly ? "filed so far" : "with filings"}</p>
      </div>
      <div className="rounded-lg border border-line bg-card px-3 py-2">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">House</dt>
        <dd className="text-2xl font-semibold tabular-nums text-ink">{house}</dd>
        <p className="text-xs text-muted">
          {board.filingsSoFarOnly ? "districts so far" : "districts with filings"}
        </p>
      </div>
    </dl>
  );
}
