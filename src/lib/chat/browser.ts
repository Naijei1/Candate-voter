import {
  classifyChatStatus,
  parseChatSuccess,
  parseRetryAfterSeconds,
  type ChatErrorKind,
} from "./ui";
import type { ChatMode, ChatRequest, ChatSource } from "./types";

/** Buffered wait. Tool rounds can take a while; the visitor can cancel sooner. */
export const CHAT_TIMEOUT_MS = 90_000;

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

/**
 * One buffered `POST /api/chat`. No streaming and no client credentials.
 * A 200 with `refused: true` is success. HTTP and network failures are errors.
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onAbort);

  try {
    if (input.signal?.aborted) throw new ChatCancelled();
    let response: Response;
    try {
      response = await fetchImpl("/api/chat", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(input.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (input.signal?.aborted) throw new ChatCancelled();
      if (error instanceof ChatCancelled) throw error;
      return { ok: false, kind: "network", retryAfterSeconds: null };
    }

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

    const kind = classifyChatStatus(response.status);
    const retryAfterSeconds =
      kind === "rate_limit"
        ? parseRetryAfterSeconds(response.headers.get("Retry-After"), nowMs())
        : null;
    return { ok: false, kind, retryAfterSeconds };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onAbort);
  }
}
