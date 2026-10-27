// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { houseScoreSentence, senateScoreSentence } from "@/lib/copy";
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
    <dl data-testid="state-scoreboard" className="mt-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-line bg-card px-3 py-2">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Senate</dt>
        <dd className="mt-1 text-sm font-medium leading-5 text-ink">
          {senateScoreSentence(board.senateFilings)}
        </dd>
      </div>
      <div className="rounded-lg border border-line bg-card px-3 py-2">
        <dt className="text-xs font-semibold tracking-wide text-muted uppercase">House</dt>
        <dd className="mt-1 text-sm font-medium leading-5 text-ink">
          {houseScoreSentence(board.districtsWithFilings, board.districtsTotal)}
        </dd>
      </div>
    </dl>
  );
}
