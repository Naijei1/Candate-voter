import { randomUUID } from "node:crypto";
import { basePathFromEnv } from "../base-path";
import { createDynamoRepository } from "../data/repository";
import { json } from "../api/http";
import { originFromRequest } from "../api/public-origin";
import { CHAT_PROMPT_VERSION, chatEnabled, rateLimitSettings } from "./config";
import { createBedrockConverse } from "./converse";
import { isVotingAdvice, VOTING_ADVICE_MARKDOWN } from "./prompt";
import { clientAddress, createRateLimiter, type RateLimiter } from "./rate-limit";
import { parseChatRequest } from "./request";
import { ChatUnavailableError, runGroundedChat } from "./run";
import type { ConverseFn } from "./types";
import type { ApiRepository } from "../api/deps";

export type ChatDeps = {
  env: Record<string, string | undefined>;
  now?: Date;
  repository: () => ApiRepository;
  converse?: ConverseFn;
  rateLimiter?: RateLimiter;
  /** Origin plus base path. Tests set this; the route derives it from the request. */
  siteRoot?: string;
};

export function liveChatDeps(
  env: Record<string, string | undefined> = process.env,
): ChatDeps {
  return {
    env,
    repository: () => createDynamoRepository(),
    converse: createBedrockConverse(env),
  };
}

export async function postChat(request: Request, deps: ChatDeps): Promise<Response> {
  const started = Date.now();
  if (request.method !== "POST") {
    return json({ error: "bad_request", message: "Use POST" }, 400);
  }

  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > 16_384) {
    return json({ error: "bad_request", message: "Request body is too large" }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", message: "Request body must be JSON" }, 400);
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return json({ error: "bad_request", message: parsed.message }, 400);
  }

  const now = deps.now ?? new Date();
  const limiter =
    deps.rateLimiter ?? createRateLimiter(rateLimitSettings(deps.env));
  const decision = limiter.take(clientAddress(request), now.getTime());
  if (!decision.ok) {
    return json(
      { error: "rate_limited", message: "Too many chat requests. Try again later." },
      429,
      { "Retry-After": String(decision.retryAfterSeconds) },
    );
  }

  if (!chatEnabled(deps.env)) {
    return json({ error: "unavailable", message: "Chat is disabled" }, 503);
  }

  const threadId = parsed.value.threadId ?? randomUUID();
  if (isVotingAdvice(parsed.value.message)) {
    logOutcome({ refused: true, tools: [], latencyMs: Date.now() - started });
    return json({
      answer_markdown: VOTING_ADVICE_MARKDOWN,
      sources: [],
      refused: true,
      threadId,
    });
  }

  const siteRoot =
    deps.siteRoot ??
    `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
  try {
    const answer = await runGroundedChat({
      request: parsed.value,
      env: deps.env,
      converse: deps.converse ?? createBedrockConverse(deps.env),
      ctx: {
        repo: deps.repository(),
        env: deps.env,
        now,
        root: siteRoot.replace(/\/+$/, ""),
      },
    });
    logOutcome({
      refused: answer.refused,
      tools: answer.tools,
      latencyMs: Date.now() - started,
      modelId: answer.modelId,
      inputTokens: answer.usage.inputTokens,
      outputTokens: answer.usage.outputTokens,
    });
    return json({
      answer_markdown: answer.answer_markdown,
      sources: answer.sources,
      refused: answer.refused,
      threadId,
    });
  } catch (error) {
    const message =
      error instanceof ChatUnavailableError
        ? error.message
        : "The model is unavailable.";
    if (!(error instanceof ChatUnavailableError)) {
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Chat failed: ${name}`);
    }
    return json({ error: "unavailable", message }, 503);
  }
}

function logOutcome(fields: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      event: "candate.chat",
      promptVersion: CHAT_PROMPT_VERSION,
      ...fields,
    }),
  );
}
