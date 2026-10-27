/** Browser chat response source. `as_of` is a stored timestamp or `unknown`. */
export type ChatSource = {
  title: string;
  url: string;
  as_of: string;
};

/** `factual` is the default. `alignment` is explicit viewpoint comparison. */
export type ChatMode = "factual" | "alignment";

export type ChatAnswer = {
  answer_markdown: string;
  sources: ChatSource[];
  refused: boolean;
  /** Lets the page show a disclaimer. Omitted only by older clients' requests. */
  mode?: ChatMode;
  /**
   * Ingest cursor write time, same ISO value as race and index `refreshedAt`.
   * Null when no cursor is stored. Omitted when this answer did not read it.
   */
  refreshedAt?: string | null;
};

export type ChatRequest = {
  message: string;
  raceId?: string;
  candidateId?: string;
  /** Election year. `year` on the wire is the same integer. */
  cycle?: number;
  /** Alias of `cycle`. Present only when it equals `cycle`. */
  year?: number;
  threadId?: string;
};

export type ChatContentBlock =
  | { text: string }
  | { toolUse: { toolUseId: string; name: string; input: unknown } }
  | {
      toolResult: {
        toolUseId: string;
        status: "success" | "error";
        content: Record<string, unknown>;
      };
    };

export type ChatMessage = {
  role: "user" | "assistant";
  content: ChatContentBlock[];
};

export type ConverseResponse = {
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "other";
  message: ChatMessage;
  usage?: { inputTokens: number; outputTokens: number };
};

/** Injected in tests. The live path calls Bedrock Converse. */
export type ConverseFn = (input: {
  modelId: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  /** Remaining request budget. The live client aborts Bedrock when it fires. */
  signal?: AbortSignal;
}) => Promise<ConverseResponse>;
