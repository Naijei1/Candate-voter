import {
  chatFailureCode,
  classifyChatStatus,
  parseChatSuccess,
  parseRetryAfterSeconds,
  type ChatErrorKind,
} from "./ui";
import type { ChatMode, ChatRequest, ChatSource } from "./types";

/**
 * Client wait for one answer. The chat contract aborts at 25 seconds so a
 * novice is not left on “Looking up public records…” for half a minute.
 * Cancel can stop sooner.
 */
export const CHAT_TIMEOUT_MS = 25_000;

export class ChatCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "ChatCancelled";
  }
}

export type ChatCallResult =
  | {
      ok: true;
      refused: boolean;
      answer_markdown: string;
      sources: ChatSource[];
      mode: ChatMode | null;
      threadId?: string;
    }
  | {
      ok: false;
      kind: ChatErrorKind;
      retryAfterSeconds: number | null;
    };

const NETWORK_ERROR: ChatCallResult = { ok: false, kind: "network", retryAfterSeconds: null };
const TIMEOUT_ERROR: ChatCallResult = { ok: false, kind: "timeout", retryAfterSeconds: null };

/**
 * One buffered `POST /api/chat`. No streaming and no client credentials.
 * A 200 with `refused: true` is success. HTTP and network failures are errors.
 * The returned promise settles on success, HTTP error, timeout, or cancel even
 * when `fetch` ignores `AbortSignal`.
 */
export async function postChatMessage(input: {
  body: ChatRequest;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  nowMs?: () => number;
}): Promise<ChatCallResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const nowMs = input.nowMs ?? Date.now;
  const timeoutMs = input.timeoutMs ?? CHAT_TIMEOUT_MS;
  if (input.signal?.aborted) throw new ChatCancelled();

  const controller = new AbortController();
  let settled = false;
  const clock: { id?: ReturnType<typeof setTimeout> } = {};
  let onUserAbort: (() => void) | undefined;

  const operation = requestChat(fetchImpl, input.body, controller.signal, nowMs);
  void operation.catch(() => {});

  return new Promise((resolve, reject) => {
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      if (clock.id) clearTimeout(clock.id);
      if (onUserAbort) input.signal?.removeEventListener("abort", onUserAbort);
      settle();
    };

    clock.id = setTimeout(() => {
      controller.abort();
      finish(() => resolve(TIMEOUT_ERROR));
    }, timeoutMs);

    onUserAbort = () => {
      controller.abort();
      finish(() => reject(new ChatCancelled()));
    };
    input.signal?.addEventListener("abort", onUserAbort);

    operation.then(
      (result) => finish(() => resolve(result)),
      (error: unknown) => {
        if (input.signal?.aborted || error instanceof ChatCancelled) {
          finish(() => reject(error instanceof ChatCancelled ? error : new ChatCancelled()));
          return;
        }
        finish(() => resolve(NETWORK_ERROR));
      },
    );
  });
}

async function requestChat(
  fetchImpl: typeof fetch,
  body: ChatRequest,
  signal: AbortSignal,
  nowMs: () => number,
): Promise<ChatCallResult> {
  const response = await fetchImpl("/api/chat", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (response.status === 200) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, kind: "unavailable", retryAfterSeconds: null };
    }
    const parsed = parseChatSuccess(payload);
    if (!parsed.ok) return { ok: false, kind: "unavailable", retryAfterSeconds: null };
    return {
      ok: true,
      refused: parsed.refused,
      answer_markdown: parsed.answer_markdown,
      sources: parsed.sources,
      mode: parsed.mode,
      ...(parsed.threadId ? { threadId: parsed.threadId } : {}),
    };
  }

  let errorBody: unknown = null;
  try {
    errorBody = await response.json();
  } catch {
    errorBody = null;
  }
  const coded = chatFailureCode(errorBody);
  const kind: ChatErrorKind = coded ?? classifyChatStatus(response.status);
  const retryAfterSeconds =
    kind === "rate_limit"
      ? parseRetryAfterSeconds(response.headers.get("Retry-After"), nowMs())
      : null;
  return { ok: false, kind, retryAfterSeconds };
}
