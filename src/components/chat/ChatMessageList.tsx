"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState } from "react";
import { CitationCard } from "@/components/chat/CitationCard";
import { MarkdownAnswer } from "@/components/chat/MarkdownAnswer";
import type { AssistantTurn, ChatTurn } from "@/components/chat/useChat";
import { ALIGNMENT_DISCLAIMER, ASK_INTRO } from "@/lib/chat/scope";
import { errorCopy, rateLimitRemainingSeconds } from "@/lib/chat/ui";

export function ChatMessageList({
  turns,
  pending,
  now,
  onRetry,
}: {
  turns: ChatTurn[];
  pending: boolean;
  now: number;
  onRetry: () => void;
}) {
  const endId = turns.length > 0 ? turns[turns.length - 1]?.id : "empty";

  useEffect(() => {
    document.getElementById(`chat-turn-${endId}`)?.scrollIntoView({ block: "nearest" });
  }, [endId, turns]);

  if (turns.length === 0) {
    return (
      <div className="space-y-4 px-4 py-4">
        <p className="text-sm leading-6 text-muted">{ASK_INTRO}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="space-y-3">
        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} id={`chat-turn-${turn.id}`} className="flex justify-end">
              <p className="max-w-[95%] rounded-xl rounded-br-sm bg-accent px-3 py-2 text-sm leading-6 text-white">
                {turn.text}
              </p>
            </div>
          ) : (
            <div key={turn.id} id={`chat-turn-${turn.id}`}>
              <AssistantBubble turn={turn} now={now} pending={pending} onRetry={onRetry} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function AssistantBubble({
  turn,
  now,
  pending,
  onRetry,
}: {
  turn: AssistantTurn;
  now: number;
  pending: boolean;
  onRetry: () => void;
}) {
  if (turn.status === "loading") {
    return (
      <div className="max-w-[95%] rounded-xl rounded-bl-sm border border-line bg-paper px-3 py-2" aria-busy="true">
        <LoadingCopy />
        <div className="mt-2 h-2.5 w-[90%] rounded bg-line motion-safe:animate-pulse" />
        <div className="mt-2 h-2.5 w-[70%] rounded bg-line motion-safe:animate-pulse" />
      </div>
    );
  }

  if (turn.status === "error") {
    const remaining =
      turn.kind === "rate_limit" ? rateLimitRemainingSeconds(turn.retryAt, now) : 0;
    const announcedWait =
      turn.kind === "rate_limit" && turn.hadRetryAfter ? (remaining > 0 ? turn.retryAfterSeconds : 0) : null;
    const copy = errorCopy(turn.kind, announcedWait);
    const locked = turn.kind === "rate_limit" && turn.hadRetryAfter && remaining > 0;
    return (
      <div className="max-w-[95%] rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950" role="alert">
        <p>{copy}</p>
        {turn.kind === "bad_request" ? null : (
          <button
            type="button"
            onClick={onRetry}
            disabled={locked || pending}
            className="mt-2 rounded-md border border-amber-400 bg-card px-2.5 py-1 text-sm font-semibold text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locked ? `Retry in ${remaining}s` : "Retry"}
          </button>
        )}
      </div>
    );
  }

  const heading = turn.status === "refused" ? "Where to look" : "Sources";
  return (
    <div
      className={
        turn.status === "refused"
          ? "max-w-[95%] rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-6 text-ink"
          : "max-w-[95%] rounded-xl rounded-bl-sm border border-line bg-paper px-3 py-2 text-sm leading-6 text-ink"
      }
      role={turn.status === "refused" ? "status" : undefined}
    >
      <MarkdownAnswer markdown={turn.markdown} />
      {turn.mode === "alignment" ? (
        <p className="mt-3 text-sm leading-6 text-muted">{ALIGNMENT_DISCLAIMER}</p>
      ) : null}
      {turn.sources.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{heading}</h3>
          <ul className="mt-2 space-y-2" aria-label={heading}>
            {turn.sources.map((source) => (
              <CitationCard key={`${source.url}:${source.title}`} source={source} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Wait copy while a lookup is in flight. The request itself aborts at 25s. */
export function loadingStatus(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  if (elapsedMs >= 16_000) {
    return `Still looking (${seconds}s). This stops if public records don't come back. Cancel, or try one race.`;
  }
  if (elapsedMs >= 8_000) {
    return `Still looking up public records (${seconds}s). Cancel if you want to stop, or try a narrower question.`;
  }
  if (elapsedMs >= 4_000) {
    return "Still looking up public records… You can cancel.";
  }
  return "Looking up public records…";
}

function LoadingCopy() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <p className="text-sm text-muted">{loadingStatus(seconds * 1000)}</p>;
}

export function politeStatus(turns: ChatTurn[]): string {
  const last = [...turns].reverse().find((turn) => turn.role === "assistant");
  if (!last || last.role !== "assistant") return "";
  if (last.status === "loading") return "Looking up public records.";
  if (last.status === "done") {
    const count = last.sources.length;
    return `Answer ready. ${count} ${count === 1 ? "source" : "sources"}.`;
  }
  if (last.status === "refused") return "Answer ready.";
  return "";
}
