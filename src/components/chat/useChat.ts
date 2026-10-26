"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatCancelled, postChatMessage } from "@/lib/chat/browser";
import {
  buildChatRequestBody,
  rateLimitRemainingSeconds,
  type ChatContextInput,
  type ChatErrorKind,
} from "@/lib/chat/ui";
import type { ChatSource } from "@/lib/chat/types";

const SESSION_KEY = "candate.chat.session";

export type UserTurn = { id: string; role: "user"; text: string };

export type AssistantTurn =
  | { id: string; role: "assistant"; status: "loading" }
  | {
      id: string;
      role: "assistant";
      status: "done";
      markdown: string;
      sources: ChatSource[];
    }
  | {
      id: string;
      role: "assistant";
      status: "refused";
      markdown: string;
      sources: ChatSource[];
    }
  | {
      id: string;
      role: "assistant";
      status: "error";
      kind: ChatErrorKind;
      /** Epoch ms when Retry becomes available. Null when the server sent no wait. */
      retryAt: number | null;
      /** Original Retry-After delta, when the response included one. */
      retryAfterSeconds: number | null;
      hadRetryAfter: boolean;
    };

export type ChatTurn = UserTurn | AssistantTurn;

type SessionShape = {
  version: 1;
  threadId?: string;
  draft?: string;
  turns: ChatTurn[];
};

export function useChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const turnsRef = useRef(turns);
  const threadRef = useRef(threadId);
  const abortRef = useRef<AbortController | null>(null);
  const flightRef = useRef(0);
  turnsRef.current = turns;
  threadRef.current = threadId;

  useEffect(() => {
    const stored = readSession();
    if (stored) {
      setTurns(stored.turns);
      setThreadId(stored.threadId);
      if (stored.draft) setDraft(stored.draft);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeSession({ version: 1, threadId, draft, turns: persistable(turns) });
  }, [ready, threadId, draft, turns]);

  const settle = useCallback((flight: number, assistantId: string, sent: string) => {
    return (result: Awaited<ReturnType<typeof postChatMessage>>) => {
      if (flightRef.current !== flight) return;
      setPending(false);
      if (result.ok) {
        if (result.threadId) setThreadId(result.threadId);
        setTurns((current) =>
          current.map((turn) =>
            turn.id === assistantId
              ? result.refused
                ? {
                    id: assistantId,
                    role: "assistant",
                    status: "refused",
                    markdown: result.answer_markdown,
                    sources: result.sources,
                  }
                : {
                    id: assistantId,
                    role: "assistant",
                    status: "done",
                    markdown: result.answer_markdown,
                    sources: result.sources,
                  }
              : turn,
          ),
        );
        return;
      }
      const now = Date.now();
      const wait =
        result.kind === "rate_limit" && result.retryAfterSeconds != null && result.retryAfterSeconds > 0
          ? result.retryAfterSeconds
          : null;
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId
            ? {
                id: assistantId,
                role: "assistant",
                status: "error",
                kind: result.kind,
                retryAt: wait != null ? now + wait * 1000 : null,
                retryAfterSeconds: result.kind === "rate_limit" ? result.retryAfterSeconds : null,
                hadRetryAfter: result.kind === "rate_limit" && result.retryAfterSeconds != null,
              }
            : turn,
        ),
      );
      if (result.kind === "bad_request") setDraft(sent);
    };
  }, []);

  const run = useCallback(
    async (message: string, context: ChatContextInput, assistantId: string, flight: number) => {
      const built = buildChatRequestBody({
        message,
        raceId: context.raceId,
        candidateId: context.candidateId,
        cycle: context.cycle,
        threadId: threadRef.current,
      });
      if (!built.ok) {
        setPending(false);
        setDraft(message);
        setTurns((current) =>
          current.map((turn) =>
            turn.id === assistantId
              ? {
                  id: assistantId,
                  role: "assistant",
                  status: "error",
                    kind: "bad_request",
                    retryAt: null,
                    retryAfterSeconds: null,
                    hadRetryAfter: false,
                }
              : turn,
          ),
        );
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await postChatMessage({ body: built.body, signal: controller.signal });
        settle(flight, assistantId, built.body.message)(result);
      } catch (error) {
        if (flightRef.current !== flight) return;
        setPending(false);
        if (error instanceof ChatCancelled) {
          dropInFlight(assistantId, built.body.message, setDraft, setTurns);
          return;
        }
        setTurns((current) =>
          current.map((turn) =>
            turn.id === assistantId
              ? {
                  id: assistantId,
                  role: "assistant",
                  status: "error",
                  kind: "network",
                  retryAt: null,
                  retryAfterSeconds: null,
                  hadRetryAfter: false,
                }
              : turn,
          ),
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [settle],
  );

  const send = useCallback(
    async (message: string, context: ChatContextInput) => {
      const trimmed = message.trim();
      if (!trimmed || pending) return;
      if (rateLimitBlocks(turnsRef.current)) return;
      const flight = flightRef.current + 1;
      flightRef.current = flight;
      const userId = newId();
      const assistantId = newId();
      setPending(true);
      setDraft("");
      setTurns((current) => [
        ...current,
        { id: userId, role: "user", text: trimmed },
        { id: assistantId, role: "assistant", status: "loading" },
      ]);
      await run(trimmed, context, assistantId, flight);
    },
    [pending, run],
  );

  const retry = useCallback(
    async (context: ChatContextInput) => {
      if (pending || rateLimitBlocks(turnsRef.current)) return;
      const current = turnsRef.current;
      let errorIndex = -1;
      for (let index = current.length - 1; index >= 0; index -= 1) {
        const turn = current[index];
        if (turn?.role === "assistant" && turn.status === "error") {
          errorIndex = index;
          break;
        }
      }
      if (errorIndex < 1) return;
      const errorTurn = current[errorIndex];
      const userTurn = current[errorIndex - 1];
      if (!errorTurn || errorTurn.role !== "assistant" || errorTurn.status !== "error") return;
      if (!userTurn || userTurn.role !== "user") return;
      if (errorTurn.kind === "bad_request") return;
      const flight = flightRef.current + 1;
      flightRef.current = flight;
      setPending(true);
      setTurns((existing) =>
        existing.map((turn) =>
          turn.id === errorTurn.id ? { id: errorTurn.id, role: "assistant", status: "loading" } : turn,
        ),
      );
      await run(userTurn.text, context, errorTurn.id, flight);
    },
    [pending, run],
  );

  const cancel = useCallback(() => {
    flightRef.current += 1;
    abortRef.current?.abort();
    setPending(false);
    const current = turnsRef.current;
    let loadingIndex = -1;
    for (let index = current.length - 1; index >= 0; index -= 1) {
      const turn = current[index];
      if (turn?.role === "assistant" && turn.status === "loading") {
        loadingIndex = index;
        break;
      }
    }
    if (loadingIndex < 0) return;
    const loading = current[loadingIndex];
    const previous = current[loadingIndex - 1];
    if (previous?.role === "user") setDraft(previous.text);
    setTurns((existing) =>
      existing.filter((turn) => {
        if (loading && turn.id === loading.id) return false;
        if (previous?.role === "user" && turn.id === previous.id) return false;
        return true;
      }),
    );
  }, []);

  return {
    turns,
    draft,
    setDraft,
    threadId,
    ready,
    pending,
    send,
    retry,
    cancel,
  };
}

export type ChatController = ReturnType<typeof useChat>;

function dropInFlight(
  assistantId: string,
  message: string,
  setDraft: (value: string) => void,
  setTurns: (value: ChatTurn[] | ((current: ChatTurn[]) => ChatTurn[])) => void,
): void {
  setDraft(message);
  setTurns((current) => {
    const index = current.findIndex((turn) => turn.id === assistantId);
    const previous = index > 0 ? current[index - 1] : undefined;
    return current.filter((turn) => {
      if (turn.id === assistantId) return false;
      if (previous?.role === "user" && turn.id === previous.id) return false;
      return true;
    });
  });
}

function rateLimitBlocks(turns: ChatTurn[]): boolean {
  const turn = latestAssistant(turns);
  if (!turn || turn.status !== "error" || turn.kind !== "rate_limit") return false;
  if (!turn.hadRetryAfter || turn.retryAt == null) return false;
  return rateLimitRemainingSeconds(turn.retryAt, Date.now()) > 0;
}

function latestAssistant(turns: ChatTurn[]): Extract<ChatTurn, { role: "assistant" }> | undefined {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === "assistant") return turn;
  }
  return undefined;
}

function persistable(turns: ChatTurn[]): ChatTurn[] {
  return turns.filter((turn) => !(turn.role === "assistant" && turn.status === "loading"));
}

function readSession(): SessionShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionShape;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.turns)) return null;
    return {
      version: 1,
      threadId: typeof parsed.threadId === "string" ? parsed.threadId : undefined,
      draft: typeof parsed.draft === "string" ? parsed.draft.slice(0, 2000) : "",
      turns: parsed.turns.filter(isTurn),
    };
  } catch {
    return null;
  }
}

function writeSession(session: SessionShape): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The transcript is a convenience. A full storage quota must not break send.
  }
}

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as ChatTurn;
  if (typeof turn.id !== "string") return false;
  if (turn.role === "user") return typeof turn.text === "string";
  if (turn.role !== "assistant") return false;
  if (turn.status === "loading") return false;
  if (turn.status === "done" || turn.status === "refused") {
    return typeof turn.markdown === "string" && Array.isArray(turn.sources);
  }
  return turn.status === "error" && typeof turn.kind === "string";
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
