/** Browser chat response source. `as_of` is a stored timestamp or `unknown`. */
export type ChatSource = {
  title: string;
  url: string;
  as_of: string;
};

export type ChatAnswer = {
  answer_markdown: string;
  sources: ChatSource[];
  refused: boolean;
};

export type ChatRequest = {
  message: string;
  raceId?: string;
  candidateId?: string;
  cycle?: number;
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
}) => Promise<ConverseResponse>;
