import { logReadError } from "../data/read";
import { finalizeAnswer, idsIn } from "./answer";
import { chatModelId } from "./config";
import { textOf, toolUses } from "./converse";
import {
  CHAT_INCOMPLETE_MESSAGE,
  CHAT_MODEL_UNAVAILABLE_MESSAGE,
  CHAT_TIMEOUT_MESSAGE,
  ChatUnavailableError,
} from "./errors";
import { CHAT_SYSTEM_PROMPT, userPrompt, VOTING_ADVICE_MARKDOWN } from "./prompt";
import { executeChatTool, modelToolContent, type ToolContext } from "./tools";
import type { ChatAnswer, ChatMessage, ChatRequest, ChatSource, ConverseFn } from "./types";

export { ChatUnavailableError } from "./errors";

/** At most two tool turns, then one answer turn. A fourth model call is not started. */
const MAX_TOOL_ROUNDS = 3;
/** Tool calls executed in one request. Further calls in that turn get an error result. */
const MAX_TOOL_CALLS = 4;
const MAX_TOKENS = 1024;

export type ChatRunResult = ChatAnswer & {
  modelId: string;
  tools: string[];
  usage: { inputTokens: number; outputTokens: number };
};

export async function runGroundedChat(input: {
  request: ChatRequest;
  ctx: ToolContext;
  env: Record<string, string | undefined>;
  converse: ConverseFn;
  /** Epoch ms. The handler sets this from the Ask budget. */
  deadlineMs?: number;
  /** Fires with the Ask budget so a cold read cannot outlive the browser abort. */
  signal?: AbortSignal;
}): Promise<ChatRunResult> {
  const modelId = chatModelId(input.env);
  const prompt = userPrompt(input.request);
  const messages: ChatMessage[] = [
    { role: "user", content: [{ text: prompt }] },
  ];
  const grounded = idsIn(prompt);
  const sources: ChatSource[] = [];
  const recordUrls = new Set<string>();
  const snippets: string[] = [];
  const toolNames: string[] = [];
  let records = 0;
  let toolsCalled = 0;
  const usage = { inputTokens: 0, outputTokens: 0 };
  let executedTools = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const remaining = remainingMs(input.deadlineMs);
    if (input.signal?.aborted || (remaining != null && remaining < 500)) {
      throw new ChatUnavailableError(CHAT_TIMEOUT_MESSAGE, "timeout");
    }
    let response;
    try {
      response = await input.converse({
        modelId,
        system: CHAT_SYSTEM_PROMPT,
        messages,
        maxTokens: MAX_TOKENS,
        ...converseSignal(input.signal, remaining),
      });
    } catch (error) {
      if (error instanceof ChatUnavailableError) throw error;
      if (isDeadlineError(error)) {
        throw new ChatUnavailableError(CHAT_TIMEOUT_MESSAGE, "timeout");
      }
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Bedrock Converse failed: ${name}`);
      throw new ChatUnavailableError(CHAT_MODEL_UNAVAILABLE_MESSAGE, "model_unavailable");
    }

    usage.inputTokens += response.usage?.inputTokens ?? 0;
    usage.outputTokens += response.usage?.outputTokens ?? 0;

    if (response.stopReason === "max_tokens") {
      throw new ChatUnavailableError(CHAT_INCOMPLETE_MESSAGE, "incomplete");
    }

    const calls = toolUses(response.message);
    messages.push({ role: "assistant", content: response.message.content });
    if (calls.length === 0) {
      const answer = withoutVoteAdvice(
        finalizeAnswer({
          modelText: textOf(response.message),
          toolRecords: records,
          toolSources: sources,
          recordUrls: [...recordUrls],
          snippets,
          groundedText: [...grounded].join(" "),
          toolsCalled,
        }),
      );
      return {
        ...answer,
        mode: "factual",
        modelId,
        tools: toolNames,
        usage,
        refreshedAt: await readRefreshedAt(input.ctx),
      };
    }

    const results: ChatMessage["content"] = [];
    for (const call of calls) {
      toolsCalled += 1;
      toolNames.push(call.name);
      if (executedTools >= MAX_TOOL_CALLS) {
        results.push({
          toolResult: {
            toolUseId: call.toolUseId,
            status: "error",
            content: {
              error: "Lookup limit reached. Summarize the records you already have.",
            },
          },
        });
        continue;
      }
      executedTools += 1;
      const executed = await executeChatTool(call.name, call.input, input.ctx);
      if (!executed.ok) {
        if (executed.unavailable) {
          throw new ChatUnavailableError(executed.message);
        }
        results.push({
          toolResult: {
            toolUseId: call.toolUseId,
            status: "error",
            content: { error: executed.message },
          },
        });
        continue;
      }
      records += executed.records;
      for (const source of executed.sources) {
        if (!sources.some((item) => item.url === source.url)) sources.push(source);
      }
      snippets.push(...executed.snippets);
      for (const id of idsIn(JSON.stringify(executed.content))) grounded.add(id);
      collectRecordUrls(executed.content, recordUrls);
      results.push({
        toolResult: {
          toolUseId: call.toolUseId,
          status: "success",
          content: modelToolContent(executed.content),
        },
      });
    }
    messages.push({ role: "user", content: results });
  }

  throw new ChatUnavailableError(CHAT_INCOMPLETE_MESSAGE, "incomplete");
}

function converseSignal(
  parent: AbortSignal | undefined,
  remaining: number | null,
): { signal?: AbortSignal } {
  const timeout = remaining != null ? AbortSignal.timeout(Math.max(1, remaining)) : undefined;
  if (parent && timeout) return { signal: AbortSignal.any([parent, timeout]) };
  const signal = parent ?? timeout;
  return signal ? { signal } : {};
}

function remainingMs(deadlineMs: number | undefined): number | null {
  if (deadlineMs == null) return null;
  return deadlineMs - Date.now();
}

function isDeadlineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
}

async function readRefreshedAt(ctx: ToolContext): Promise<string | null> {
  try {
    return (await ctx.repo.getWatermark())?.updatedAt ?? null;
  } catch (error) {
    logReadError("getWatermark", error);
    return null;
  }
}

function collectRecordUrls(value: unknown, into: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectRecordUrls(item, into);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      (key === "sourceUrl" || key === "url") &&
      typeof child === "string" &&
      /^https:\/\//i.test(child)
    ) {
      into.add(child);
      continue;
    }
    collectRecordUrls(child, into);
  }
}

function withoutVoteAdvice<T extends { answer_markdown: string; sources: ChatAnswer["sources"]; refused: boolean }>(
  answer: T,
): T {
  if (!/\bvote for\b/i.test(answer.answer_markdown)) return answer;
  return {
    ...answer,
    answer_markdown: VOTING_ADVICE_MARKDOWN,
    sources: [],
    refused: true,
  };
}
