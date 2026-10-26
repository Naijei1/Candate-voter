"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import { withBasePath } from "@/lib/base-path";
import {
  ALIGNMENT_DISCLAIMER,
  ASK_INTRO,
  buildChatPayload,
  parseChatResponse,
  retryAfterSeconds,
  type AskScope,
} from "@/lib/chat/scope";
import { formatInstant, httpsUrl } from "@/lib/format";
import type { ChatSource } from "@/lib/chat/types";

type AskContextValue = {
  scope: AskScope | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  replaceScope: (scope: AskScope) => () => void;
};

const AskContext = createContext<AskContextValue | null>(null);

export function AskProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<AskScope | null>(null);
  const [open, setOpen] = useState(false);
  const generation = useRef(0);
  const replaceScope = useCallback((next: AskScope) => {
    const id = ++generation.current;
    setScope(next);
    return () => {
      if (generation.current === id) setScope(null);
    };
  }, []);
  const value = useMemo(
    () => ({ scope, open, setOpen, replaceScope }),
    [scope, open, replaceScope],
  );
  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
}

export function useAsk(): AskContextValue {
  const value = useContext(AskContext);
  if (!value) throw new Error("Ask is not available on this page");
  return value;
}

export function AskScope(scope: AskScope) {
  const { replaceScope } = useAsk();
  const { kind, label, cycle, raceId, candidateId } = scope;
  const panel = (scope.panelRaceIds ?? []).join(",");
  useEffect(() => {
    return replaceScope({
      kind,
      label,
      ...(cycle != null ? { cycle } : {}),
      ...(raceId ? { raceId } : {}),
      ...(candidateId ? { candidateId } : {}),
      ...(panel ? { panelRaceIds: panel.split(",") } : {}),
    });
  }, [replaceScope, kind, label, cycle, raceId, candidateId, panel]);
  return null;
}

export function AskButton() {
  const { open, setOpen } = useAsk();
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="ask-drawer"
      onClick={() => setOpen(!open)}
      className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Ask
    </button>
  );
}

type Turn =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      markdown: string;
      sources: ChatSource[];
      refused: boolean;
      mode: "alignment" | "factual" | null;
    };

export function AskDrawer() {
  const { open, setOpen, scope } = useAsk();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const threadId = useRef<string | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!open) return;
    fieldRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turns, pending, error, open]);

  useEffect(() => {
    if (waitSeconds == null) return;
    if (waitSeconds <= 0) {
      setWaitSeconds(null);
      return;
    }
    const timer = window.setTimeout(() => setWaitSeconds((value) => (value == null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [waitSeconds]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || (waitSeconds != null && waitSeconds > 0)) return;
    if (text.length > 2000) {
      setError("Keep the question under 2000 characters.");
      return;
    }

    const id = nextId.current++;
    setTurns((current) => [...current, { id, role: "user", text }]);
    setDraft("");
    setError(null);
    setPending(true);

    const payload = buildChatPayload({
      message: text,
      scope,
      ...(threadId.current ? { threadId: threadId.current } : {}),
    });

    try {
      const response = await fetch(withBasePath("/api/chat"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const retry = retryAfterSeconds(response.headers.get("Retry-After"));
        setWaitSeconds(retry);
        setError(
          retry != null
            ? `Too many questions. Try again in ${retry} seconds.`
            : "Too many questions. Try again later.",
        );
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readError(body) ?? "Ask is unavailable right now. No filings were added.");
        return;
      }

      const parsed = parseChatResponse(body);
      if (!parsed) {
        setError("The answer could not be read. No filings were added.");
        return;
      }
      if (parsed.threadId) threadId.current = parsed.threadId;
      setTurns((current) => [
        ...current,
        {
          id: nextId.current++,
          role: "assistant",
          markdown: parsed.answerMarkdown,
          sources: parsed.sources,
          refused: parsed.refused,
          mode: parsed.mode,
        },
      ]);
    } catch {
      setError("Ask could not be reached. No filings were added.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const locked = pending || (waitSeconds != null && waitSeconds > 0);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onMouseDown={() => setOpen(false)}>
      <div
        id="ask-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="ask-drawer"
        className="ask-drawer flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-sm"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              Ask
            </h2>
            <p className="text-sm text-muted">
              {scope ? (
                <>
                  Asking about <span className="font-medium text-ink">{scope.label}</span>
                </>
              ) : (
                "Asking about stored filings."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close
          </button>
        </div>

        <div ref={logRef} data-ask-log className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="text-sm leading-6 text-muted">{ASK_INTRO}</p>
          {turns.map((turn) =>
            turn.role === "user" ? (
              <p key={turn.id} className="rounded-lg bg-paper px-3 py-2 text-sm leading-6 break-words text-ink">
                {turn.text}
              </p>
            ) : (
              <article
                key={turn.id}
                className={
                  turn.refused
                    ? "rounded-lg border border-line bg-paper px-3 py-2"
                    : "px-1 py-1"
                }
              >
                <SafeMarkdown source={turn.markdown} />
                {turn.mode === "alignment" ? (
                  <p className="mt-3 text-sm leading-6 text-muted">{ALIGNMENT_DISCLAIMER}</p>
                ) : null}
                {turn.sources.length > 0 ? <SourceList sources={turn.sources} /> : null}
              </article>
            ),
          )}
          {pending ? (
            <p className="text-sm text-muted" role="status">
              Looking up stored filings…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm leading-6 text-muted" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line px-4 py-3">
          <label htmlFor="ask-question" className="sr-only">
            Question
          </label>
          <textarea
            id="ask-question"
            ref={fieldRef}
            value={draft}
            rows={3}
            maxLength={2000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about a stored filing"
            className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm leading-6 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <div className="mt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={locked || draft.trim().length === 0}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              {waitSeconds != null && waitSeconds > 0 ? `Wait ${waitSeconds}s` : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {sources.map((source) => {
        const href = httpsUrl(source.url);
        const host = href ? hostOf(href) : null;
        const asOf = formatInstant(source.as_of);
        return (
          <li key={`${source.url}:${source.title}`} className="min-w-0">
            {href ? (
              <a
                href={href}
                className="inline-flex max-w-full min-w-0 items-baseline gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="truncate">{source.title}</span>
                {host ? <span className="shrink-0 text-xs text-muted">{host}</span> : null}
              </a>
            ) : (
              <span className="text-sm text-muted">{source.title}</span>
            )}
            <p className="mt-1 text-xs text-muted">
              {asOf ? <>As of {asOf}</> : "As-of time not stored"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function readError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const message = (body as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const text = message.trim();
  if (!text || text.length > 240) return null;
  return text;
}
