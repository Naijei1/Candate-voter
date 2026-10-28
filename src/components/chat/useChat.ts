"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatCancelled, postChatMessage, type ChatCallResult } from "@/lib/chat/browser";
import {
  applyPagePrefix,
  askHistoryScope,
  narrowAskContext,
  scopeFromHistoryKey,
  shouldDropHistoryForSend,
  type AskHistoryScope,
} from "@/lib/chat/scope";
import {
  buildChatRequestBody,
  rateLimitRemainingSeconds,
  type ChatContextInput,
  type ChatErrorKind,
} from "@/lib/chat/ui";
import type { ChatMode, ChatSource } from "@/lib/chat/types";

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
      mode: ChatMode | null;
    }
  | {
      id: string;
      role: "assistant";
      status: "refused";
      markdown: string;
      sources: ChatSource[];
      mode: ChatMode | null;
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

/** Replace the in-flight assistant row. A success or error never leaves that row loading. */
export function settleAssistantTurn(
  turns: ChatTurn[],
  assistantId: string,
  result: ChatCallResult,
  now: number,
): ChatTurn[] {
  const direct = applyAssistantResult(turns, assistantId, result, now);
  if (direct.matched) return direct.turns;
  const fallbackId = lastLoadingId(turns);
  if (!fallbackId || fallbackId === assistantId) return direct.turns;
  return applyAssistantResult(turns, fallbackId, result, now).turns;
}

type SessionShape = {
  version: 2;
  bindingKey: string;
  historyScope: AskHistoryScope | null;
  threadId?: string;
  draft: string;
  turns: ChatTurn[];
};

export type AskHistorySnapshot = {
  bindingKey: string | null;
  historyScope: AskHistoryScope | null;
  threadId?: string;
  draft: string;
  turns: ChatTurn[];
};

export type StoredAskHistory = {
  bindingKey: string;
  historyScope: AskHistoryScope | null;
  threadId?: string;
  draft: string;
  turns: ChatTurn[];
};

/**
 * Restore a thread only when it was saved for this year, place, race, and scope.
 * A different context starts empty so a Senate open cannot show a House answer.
 */
export function applyAskBinding(
  state: AskHistorySnapshot,
  key: string,
  stored: StoredAskHistory | null,
): { state: AskHistorySnapshot; restore: boolean; clear: boolean } {
  if (state.bindingKey === key) return { state, restore: false, clear: false };
  const untouched = state.turns.length === 0 && state.threadId == null;
  if (stored && stored.bindingKey === key && (state.bindingKey == null || untouched)) {
    return {
      restore: true,
      clear: false,
      state: {
        bindingKey: key,
        historyScope: stored.historyScope ?? scopeFromHistoryKey(key),
        threadId: stored.threadId,
        draft: stored.draft,
        turns: stored.turns,
      },
    };
  }
  return {
    restore: false,
    clear: state.bindingKey != null,
    state: {
      bindingKey: key,
      historyScope: scopeFromHistoryKey(key),
      threadId: undefined,
      draft: state.bindingKey == null ? state.draft : "",
      turns: [],
    },
  };
}

export function useChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraftState] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const turnsRef = useRef(turns);
  const threadRef = useRef(threadId);
  const draftRef = useRef(draft);
  const bindingRef = useRef<string | null>(null);
  const historyScopeRef = useRef<AskHistoryScope | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const flightRef = useRef(0);
  const pendingRef = useRef(false);
  turnsRef.current = turns;
  threadRef.current = threadId;
  draftRef.current = draft;

  const setDraft = useCallback((value: string) => {
    draftRef.current = value;
    setDraftState(value);
  }, []);

  const syncBinding = useCallback((key: string) => {
    const stored = readSession();
    const applied = applyAskBinding(
      {
        bindingKey: bindingRef.current,
        historyScope: historyScopeRef.current,
        threadId: threadRef.current,
        draft: draftRef.current,
        turns: turnsRef.current,
      },
      key,
      stored,
    );
    if (applied.state.bindingKey === bindingRef.current && !applied.restore) return;
    if (applied.clear) {
      flightRef.current += 1;
      pendingRef.current = false;
      abortRef.current?.abort();
      setPending(false);
    }
    bindingRef.current = applied.state.bindingKey;
    historyScopeRef.current = applied.state.historyScope;
    threadRef.current = applied.state.threadId;
    draftRef.current = applied.state.draft;
    setThreadId(applied.state.threadId);
    setDraftState(applied.state.draft);
    setTurns(applied.state.turns);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !bindingRef.current) return;
    if (turns.length === 0 && threadId == null) {
      const stored = readSession();
      if (stored && stored.bindingKey !== bindingRef.current && stored.turns.length > 0) return;
    }
    writeSession({
      version: 2,
      bindingKey: bindingRef.current,
      historyScope: historyScopeRef.current,
      threadId,
      draft,
      turns: persistable(turns),
    });
  }, [ready, threadId, draft, turns]);

  const run = useCallback(
    async (message: string, context: ChatContextInput, assistantId: string, flight: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const scoped = narrowAskContext(message, context);
        const built = buildChatRequestBody({
          message: applyPagePrefix(scoped.messagePrefix, message),
          raceId: scoped.raceId,
          candidateId: scoped.candidateId,
          cycle: scoped.cycle,
          state: scoped.state,
          zip: scoped.zip,
          threadId: threadRef.current,
        });
        if (!built.ok) {
          setDraft(message);
          setTurns((current) =>
            settleAssistantTurn(
              current,
              assistantId,
              { ok: false, kind: "bad_request", retryAfterSeconds: null },
              Date.now(),
            ),
          );
          return;
        }

        const result = await postChatMessage({ body: built.body, signal: controller.signal });
        if (flightRef.current !== flight) return;
        if (result.ok && result.threadId) setThreadId(result.threadId);
        if (!result.ok && result.kind === "bad_request") setDraft(message);
        setTurns((current) => settleAssistantTurn(current, assistantId, result, Date.now()));
      } catch (error) {
        if (flightRef.current !== flight) return;
        if (error instanceof ChatCancelled) {
          dropInFlight(assistantId, message, setDraft, setTurns);
          return;
        }
        setTurns((current) =>
          settleAssistantTurn(
            current,
            assistantId,
            { ok: false, kind: "network", retryAfterSeconds: null },
            Date.now(),
          ),
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (flightRef.current === flight) {
          pendingRef.current = false;
          setPending(false);
        }
      }
    },
    [setDraft],
  );

  const send = useCallback(
    async (message: string, context: ChatContextInput) => {
      const trimmed = message.trim();
      if (!trimmed || pendingRef.current) return;
      if (rateLimitBlocks(turnsRef.current)) return;
      const dropMixed = shouldDropHistoryForSend(historyScopeRef.current, trimmed, context);
      pendingRef.current = true;
      const flight = flightRef.current + 1;
      flightRef.current = flight;
      const userId = newId();
      const assistantId = newId();
      if (dropMixed) {
        historyScopeRef.current = "senate";
        threadRef.current = undefined;
        setThreadId(undefined);
      } else if (askHistoryScope(narrowAskContext(trimmed, context)) !== "senate") {
        historyScopeRef.current = askHistoryScope(context);
      } else if (historyScopeRef.current == null) {
        historyScopeRef.current = "senate";
      }
      setPending(true);
      setDraft("");
      const userTurn: UserTurn = { id: userId, role: "user", text: trimmed };
      const loading: AssistantTurn = { id: assistantId, role: "assistant", status: "loading" };
      setTurns((current) => [...(dropMixed ? [] : current), userTurn, loading]);
      await run(trimmed, context, assistantId, flight);
    },
    [run, setDraft],
  );

  const retry = useCallback(
    async (context: ChatContextInput) => {
      if (pendingRef.current || rateLimitBlocks(turnsRef.current)) return;
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
      pendingRef.current = true;
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
    [run],
  );

  const cancel = useCallback(() => {
    flightRef.current += 1;
    pendingRef.current = false;
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
  }, [setDraft]);

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
    syncBinding,
  };
}

export type ChatController = ReturnType<typeof useChat>;

function applyAssistantResult(
  turns: ChatTurn[],
  assistantId: string,
  result: ChatCallResult,
  now: number,
): { turns: ChatTurn[]; matched: boolean } {
  let matched = false;
  const next = turns.map((turn) => {
    if (turn.id !== assistantId || turn.role !== "assistant") return turn;
    matched = true;
    if (result.ok) {
      return result.refused
        ? {
            id: assistantId,
            role: "assistant" as const,
            status: "refused" as const,
            markdown: result.answer_markdown,
            sources: result.sources,
            mode: result.mode,
          }
        : {
            id: assistantId,
            role: "assistant" as const,
            status: "done" as const,
            markdown: result.answer_markdown,
            sources: result.sources,
            mode: result.mode,
          };
    }
    const wait =
      result.kind === "rate_limit" && result.retryAfterSeconds != null && result.retryAfterSeconds > 0
        ? result.retryAfterSeconds
        : null;
    return {
      id: assistantId,
      role: "assistant" as const,
      status: "error" as const,
      kind: result.kind,
      retryAt: wait != null ? now + wait * 1000 : null,
      retryAfterSeconds: result.kind === "rate_limit" ? result.retryAfterSeconds : null,
      hadRetryAfter: result.kind === "rate_limit" && result.retryAfterSeconds != null,
    };
  });
  return { turns: next, matched };
}

function lastLoadingId(turns: readonly ChatTurn[]): string | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === "assistant" && turn.status === "loading") return turn.id;
  }
  return null;
}

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

function readSession(): StoredAskHistory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionShape;
    if (!parsed || parsed.version !== 2 || typeof parsed.bindingKey !== "string" || !Array.isArray(parsed.turns)) {
      return null;
    }
    return {
      bindingKey: parsed.bindingKey,
      historyScope: readHistoryScope(parsed.historyScope, parsed.bindingKey),
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

function readHistoryScope(value: unknown, bindingKey: string): AskHistoryScope {
  if (value === "senate" || value === "house" || value === "president" || value === "mixed" || value === "open") {
    return value;
  }
  return scopeFromHistoryKey(bindingKey);
}

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as ChatTurn;
  if (typeof turn.id !== "string") return false;
  if (turn.role === "user") return typeof turn.text === "string";
  if (turn.role !== "assistant") return false;
  if (turn.status === "loading") return false;
  if (turn.status === "done" || turn.status === "refused") {
    const mode = "mode" in turn ? turn.mode : null;
    return (
      typeof turn.markdown === "string" &&
      Array.isArray(turn.sources) &&
      (mode == null || mode === "factual" || mode === "alignment")
    );
  }
  return turn.status === "error" && typeof turn.kind === "string";
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
