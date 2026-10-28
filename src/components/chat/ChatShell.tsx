"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList, politeStatus } from "@/components/chat/ChatMessageList";
import type { ChatController } from "@/components/chat/useChat";
import { askHistoryKey } from "@/lib/chat/scope";
import {
  chatPageHref,
  contextLabel,
  rateLimitRemainingSeconds,
  type ChatContextInput,
} from "@/lib/chat/ui";

export function ChatShell({
  mode,
  context,
  chat,
  onClose,
}: {
  mode: "page" | "panel";
  context: ChatContextInput;
  chat: ChatController;
  onClose?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const contextKey = askHistoryKey(context);
  useEffect(() => {
    setDismissed(false);
  }, [contextKey]);

  const active = useMemo<ChatContextInput>(
    () => ({
      cycle: context.cycle,
      ...(context.state ? { state: context.state } : {}),
      ...(context.zip ? { zip: context.zip } : {}),
      ...(dismissed
        ? {}
        : {
            raceId: context.raceId,
            candidateId: context.candidateId,
            messagePrefix: context.messagePrefix,
          }),
    }),
    [
      context.cycle,
      context.state,
      context.zip,
      context.raceId,
      context.candidateId,
      context.messagePrefix,
      dismissed,
    ],
  );
  const bindingKey = askHistoryKey(active);
  useLayoutEffect(() => {
    chat.syncBinding(bindingKey);
  }, [bindingKey, chat]);

  const label = dismissed ? null : contextLabel(context);
  const titleId = mode === "page" ? "chat-page-title" : "ask-panel-title";
  const latest = [...chat.turns].reverse().find((turn) => turn.role === "assistant");
  const clockActive =
    latest?.role === "assistant" &&
    latest.status === "error" &&
    latest.kind === "rate_limit" &&
    latest.retryAt != null &&
    latest.retryAt > Date.now();
  const now = useSecondClock(clockActive);
  const sendLocked =
    latest?.role === "assistant" &&
    latest.status === "error" &&
    latest.kind === "rate_limit" &&
    latest.hadRetryAfter &&
    latest.retryAt != null &&
    rateLimitRemainingSeconds(latest.retryAt, now) > 0;

  function send(message: string) {
    void chat.send(message, active);
  }

  return (
    <section className={mode === "page" ? "flex min-h-[70vh] flex-col" : "flex h-full min-h-0 flex-col"} aria-labelledby={titleId}>
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        {mode === "page" ? (
          <h1 id={titleId} className="text-lg font-semibold tracking-tight">
            Ask a question
          </h1>
        ) : (
          <strong id={titleId} className="text-base font-semibold">
            Ask a question
          </strong>
        )}
        <span className="flex-1" />
        {mode === "panel" ? (
          <Link
            href={chatPageHref(active, chat.draft)}
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open in full page
          </Link>
        ) : null}
        {mode === "panel" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close
          </button>
        ) : null}
      </header>
      {label ? (
        <div className="px-4 pt-3">
          <p
            data-testid="ask-context"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent"
          >
            <span className="min-w-0">
              <span className="font-semibold">Asking about </span>
              <span>{label}</span>
            </span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Clear context"
              className="shrink-0 rounded-full border border-accent/30 bg-card px-2 py-0.5 text-xs font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear
            </button>
          </p>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatMessageList
          turns={chat.turns}
          pending={chat.pending}
          now={now}
          onRetry={() => void chat.retry(active)}
        />
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {politeStatus(chat.turns)}
      </p>
      <ChatComposer
        value={chat.draft}
        pending={chat.pending}
        sendLocked={sendLocked}
        onChange={chat.setDraft}
        onSend={() => send(chat.draft)}
        onCancel={chat.cancel}
      />
    </section>
  );
}

function useSecondClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}
