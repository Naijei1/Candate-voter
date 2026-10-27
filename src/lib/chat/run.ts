import { logReadError } from "../data/read";
import { chatModelId } from "./config";
import { finalizeAnswer, idsIn } from "./answer";
import { textOf, toolUses } from "./converse";
import { CHAT_SYSTEM_PROMPT, userPrompt, VOTING_ADVICE_MARKDOWN } from "./prompt";
import { executeChatTool, modelToolContent, type ToolContext } from "./tools";
import type { ChatAnswer, ChatMessage, ChatRequest, ChatSource, ConverseFn } from "./types";

const MAX_TOOL_ROUNDS = 4;
const MAX_TOKENS = 1024;

export class ChatUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatUnavailableError";
  }
}

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

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    let response;
    try {
      response = await input.converse({
        modelId,
        system: CHAT_SYSTEM_PROMPT,
        messages,
        maxTokens: MAX_TOKENS,
      });
    } catch (error) {
      if (error instanceof ChatUnavailableError) throw error;
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Bedrock Converse failed: ${name}`);
      throw new ChatUnavailableError("The model is unavailable.");
    }

    usage.inputTokens += response.usage?.inputTokens ?? 0;
    usage.outputTokens += response.usage?.outputTokens ?? 0;

    if (response.stopReason === "max_tokens") {
      throw new ChatUnavailableError("The model response was incomplete.");
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

  throw new ChatUnavailableError("The model did not finish.");
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
