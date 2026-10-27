// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { houseScoreSentence, senateScoreSentence } from "@/lib/copy";
import { formatInstant, instantDateTime } from "@/lib/format";
import type { StateScoreboard as Scoreboard } from "@/lib/landing";

export function WhatAmILookingAt({
  refreshedAt,
  glass = false,
}: {
  refreshedAt?: string | null;
  glass?: boolean;
}) {
  const refreshed = formatInstant(refreshedAt);
  const dateTime = instantDateTime(refreshedAt);
  return (
    <details data-testid="looking-at" className={glass ? "glass-details" : "mt-3"}>
      <summary className={glass ? "glass-summary" : "inline-flex cursor-pointer list-none rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"}>
        What am I looking at?
      </summary>
      <div className={glass ? "glass-panel" : "mt-2 rounded-lg border border-line bg-card p-3 text-sm leading-5 text-ink"}>
        <p>
          A statement of candidacy (Form 2) is an FEC filing that someone intends to run.
        </p>
        <p className="mt-1">These are candidates so far, not the final ballot. No endorsements.</p>
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
  return (
    <p data-testid="state-scoreboard" className="mt-3 text-sm leading-6 text-ink">
      {senateScoreSentence(board.senateFilings)}
      <span aria-hidden="true"> · </span>
      <span className="sr-only"> </span>
      {houseScoreSentence(board.districtsWithFilings, board.districtsTotal)}
    </p>
  );
}
