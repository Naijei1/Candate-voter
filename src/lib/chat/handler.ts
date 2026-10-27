import { randomUUID } from "node:crypto";
import { basePathFromEnv } from "../base-path";
import { createDynamoRepository } from "../data/repository";
import { json } from "../api/http";
import { originFromRequest } from "../api/public-origin";
import {
  ALIGNMENT_DISABLED_MARKDOWN,
  answerAlignment,
} from "./alignment";
import {
  alignmentEnabled,
  CHAT_PROMPT_VERSION,
  chatBudgetMs,
  chatEnabled,
  rateLimitSettings,
} from "./config";
import { definitionAnswer } from "./definitions";
import { CHAT_TIMEOUT_MESSAGE, ChatUnavailableError, unavailableBody } from "./errors";
import { createBedrockConverse } from "./converse";
import {
  CLARIFY_RACE_MARKDOWN,
  isAlignmentRequest,
  isUpcomingElectionsQuestion,
  needsRaceClarification,
} from "./intent";
import { polishChatAnswer } from "./polish";
import { answerUpcoming } from "./upcoming";
import { isVotingAdvice, VOTING_ADVICE_MARKDOWN } from "./prompt";
import { clientAddress, createRateLimiter, type RateLimiter } from "./rate-limit";
import { parseChatRequest } from "./request";
import { isStateRosterQuestion, answerStateRoster } from "./roster";
import { runGroundedChat } from "./run";
import type { ChatAnswer, ConverseFn } from "./types";
import type { ApiRepository } from "../api/deps";

export type ChatDeps = {
  env: Record<string, string | undefined>;
  now?: Date;
  repository: () => ApiRepository;
  converse?: ConverseFn;
  rateLimiter?: RateLimiter;
  /** Origin plus base path. Tests set this; the route derives it from the request. */
  siteRoot?: string;
  /** Test override. Production uses `chatBudgetMs` (default 20s). */
  budgetMs?: number;
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
    logOutcome({ refused: true, tools: [], latencyMs: Date.now() - started, mode: "factual" });
    return json(
      chatBody(
        {
          answer_markdown: VOTING_ADVICE_MARKDOWN,
          sources: [],
          refused: true,
          mode: "factual",
        },
        threadId,
        parsed.value.message,
      ),
    );
  }

  if (isAlignmentRequest(parsed.value.message)) {
    if (!alignmentEnabled(deps.env)) {
      logOutcome({ refused: true, tools: [], latencyMs: Date.now() - started, mode: "factual" });
      return json(
        chatBody(
          {
            answer_markdown: ALIGNMENT_DISABLED_MARKDOWN,
            sources: [],
            refused: true,
            mode: "factual",
          },
          threadId,
          parsed.value.message,
        ),
      );
    }
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await answerAlignment({
        request: parsed.value,
        ctx: chatCtx(deps, now, siteRoot, parsed.value.cycle),
      });
      if ("unavailable" in answer) {
        return json({ error: "unavailable", message: answer.message }, 503);
      }
      logOutcome({
        refused: answer.refused,
        tools: ["alignment"],
        latencyMs: Date.now() - started,
        mode: "alignment",
      });
      return json(chatBody(answer, threadId, parsed.value.message));
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Alignment lookup failed: ${name}`);
      return json({ error: "unavailable", message: "Stored records are unavailable." }, 503);
    }
  }

  if (isStateRosterQuestion(parsed.value.message)) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await withBudget(
        answerStateRoster({
          request: parsed.value,
          ctx: chatCtx(deps, now, siteRoot, parsed.value.cycle),
        }),
        budgetMs(deps),
      );
      if ("unavailable" in answer) {
        return json({ error: "unavailable", message: answer.message }, 503);
      }
      logOutcome({
        refused: answer.refused,
        tools: ["roster"],
        latencyMs: Date.now() - started,
        mode: "factual",
      });
      return json(chatBody(answer, threadId, parsed.value.message));
    } catch (error) {
      return json(unavailableBody(error), 503);
    }
  }

  const defined = definitionAnswer(parsed.value.message);
  if (defined) {
    logOutcome({ refused: false, tools: [], latencyMs: Date.now() - started, mode: "factual" });
    return json(chatBody(defined, threadId, parsed.value.message));
  }

  if (isUpcomingElectionsQuestion(parsed.value.message)) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await answerUpcoming({
        request: parsed.value,
        ctx: chatCtx(deps, now, siteRoot, parsed.value.cycle),
      });
      if ("unavailable" in answer) {
        return json({ error: "unavailable", message: answer.message }, 503);
      }
      logOutcome({
        refused: answer.refused,
        tools: ["upcoming"],
        latencyMs: Date.now() - started,
        mode: "factual",
      });
      return json(chatBody(answer, threadId, parsed.value.message));
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Upcoming lookup failed: ${name}`);
      return json({ error: "unavailable", message: "Stored records are unavailable." }, 503);
    }
  }

  if (needsRaceClarification(parsed.value)) {
    logOutcome({ refused: false, tools: [], latencyMs: Date.now() - started, mode: "factual" });
    return json(
      chatBody(
        {
          answer_markdown: CLARIFY_RACE_MARKDOWN,
          sources: [],
          refused: false,
          mode: "factual",
        },
        threadId,
        parsed.value.message,
      ),
    );
  }

  const siteRoot =
    deps.siteRoot ??
    `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
  const budget = budgetMs(deps);
  try {
    const answer = await withBudget(
      runGroundedChat({
        request: parsed.value,
        env: deps.env,
        converse: deps.converse ?? createBedrockConverse(deps.env),
        deadlineMs: Date.now() + budget,
        ctx: chatCtx(deps, now, siteRoot, parsed.value.cycle),
      }),
      budget,
    );
    logOutcome({
      refused: answer.refused,
      tools: answer.tools,
      latencyMs: Date.now() - started,
      modelId: answer.modelId,
      inputTokens: answer.usage.inputTokens,
      outputTokens: answer.usage.outputTokens,
    });
    return json(chatBody(answer, threadId, parsed.value.message));
  } catch (error) {
    return json(unavailableBody(error), 503);
  }
}

function chatBody(answer: ChatAnswer, threadId: string, priorMessage: string) {
  const polished = polishChatAnswer(answer, priorMessage);
  return {
    answer_markdown: polished.answer_markdown,
    sources: polished.sources,
    refused: polished.refused,
    mode: polished.mode ?? "factual",
    threadId,
    ...(polished.refreshedAt !== undefined ? { refreshedAt: polished.refreshedAt } : {}),
  };
}

function budgetMs(deps: ChatDeps): number {
  return deps.budgetMs ?? chatBudgetMs(deps.env);
}

function chatCtx(
  deps: ChatDeps,
  now: Date,
  siteRoot: string,
  cycle: number | undefined,
) {
  const root = (deps.siteRoot ?? siteRoot).replace(/\/+$/, "");
  return {
    repo: deps.repository(),
    env: deps.env,
    now,
    root,
    ...(cycle != null ? { cycle } : {}),
  };
}

function withBudget<T>(work: Promise<T>, budget: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ChatUnavailableError(CHAT_TIMEOUT_MESSAGE, "timeout"));
    }, budget);
  });
  void work.catch(() => {});
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
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
