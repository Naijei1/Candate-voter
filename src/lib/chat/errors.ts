/** Machine-readable 503 codes the Ask UI can map. Omitted for other 503s. */
export type ChatFailureCode = "timeout" | "model_unavailable" | "incomplete";

export const CHAT_TIMEOUT_MESSAGE =
  "The answer took too long. Try a narrower question.";

export const CHAT_INCOMPLETE_MESSAGE =
  "The answer was incomplete. Try one race at a time.";

export const CHAT_MODEL_UNAVAILABLE_MESSAGE = "The model is unavailable.";

/** SDK and fetch aborts. These are budget misses, not a dead model. */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

export class ChatUnavailableError extends Error {
  readonly code?: ChatFailureCode;

  constructor(message: string, code?: ChatFailureCode) {
    super(message);
    this.name = "ChatUnavailableError";
    this.code = code;
  }
}

export function unavailableBody(error: unknown): {
  error: "unavailable";
  message: string;
  code?: ChatFailureCode;
} {
  if (error instanceof ChatUnavailableError) {
    return {
      error: "unavailable",
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    };
  }
  const name = error instanceof Error ? error.name : "Error";
  console.error(`Chat failed: ${name}`);
  return {
    error: "unavailable",
    message: CHAT_MODEL_UNAVAILABLE_MESSAGE,
    code: "model_unavailable",
  };
}
