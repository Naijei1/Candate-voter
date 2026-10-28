import { randomUUID } from "node:crypto";
import { basePathFromEnv } from "../base-path";
import { createDynamoRepository, isLiveRepository, runWithReadAbort } from "../data/repository";
import { rosterCacheKey, rosterRead } from "../data/roster-cache";
import type { ApiRepository } from "../api/deps";
import { json } from "../api/http";
import { originFromRequest } from "../api/public-origin";
import { censusZipDistricts, type ZipDistrictHit } from "../geo/zip-districts";
import {
  ALIGNMENT_DISABLED_MARKDOWN,
  answerAlignment,
} from "./alignment";
import {
  alignmentEnabled,
  CHAT_PROMPT_VERSION,
  chatBudgetMs,
  chatEnabled,
  coldAskBudgetMs,
  rateLimitSettings,
} from "./config";
import { definitionAnswer } from "./definitions";
import { alignSourceAsOf } from "./freshness";
import { CHAT_TIMEOUT_MESSAGE, ChatUnavailableError, isAbortError, unavailableBody } from "./errors";
import { createBedrockConverse } from "./converse";
import {
  asksForAnotherState,
  CLARIFY_RACE_MARKDOWN,
  askedChamber,
  hasPlaceContext,
  isAlignmentRequest,
  isScopedRosterQuestion,
  isSingleContestScope,
  isUpcomingElectionsQuestion,
  isVagueRunningQuestion,
  needsRaceClarification,
  chamberFromRaceId,
  stateFromRaceId,
  yearFromRaceId,
} from "./intent";
import { polishChatAnswer, type AnswerScope } from "./polish";
import { answerUpcoming } from "./upcoming";
import { isVotingAdvice, VOTING_ADVICE_MARKDOWN } from "./prompt";
import { clientAddress, createRateLimiter, type RateLimiter } from "./rate-limit";
import { parseChatRequest } from "./request";
import { isStateRosterQuestion, answerKnownPlace, answerScopedRace, answerStateRoster } from "./roster";
import { limitAnswerToRaceScope } from "./scope";
import { runGroundedChat } from "./run";
import type { ChatAnswer, ChatRequest, ConverseFn } from "./types";

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
  /** ZIP on the Ask page. Tests stub this. Production uses Census. */
  lookupZip?: (zip: string) => Promise<ZipDistrictHit | null>;
};

export function liveChatDeps(
  env: Record<string, string | undefined> = process.env,
): ChatDeps {
  return {
    env,
    repository: () => createDynamoRepository(),
    converse: createBedrockConverse(env),
    lookupZip: censusZipDistricts,
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
        parsed.value,
      ),
    );
  }

  const asked = await withZipState(parsed.value, deps);

  if (isAlignmentRequest(asked.message)) {
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
          asked.message,
          asked,
        ),
      );
    }
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await answerAlignment({
        request: asked,
        ctx: chatCtx(deps, now, siteRoot, asked),
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
      return json(chatBody(answer, threadId, asked.message, asked));
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Alignment lookup failed: ${name}`);
      return json({ error: "unavailable", message: "Stored records are unavailable." }, 503);
    }
  }

  if (isScopedRosterQuestion(asked)) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await withBudget(
        (signal) =>
          runWithReadAbort(signal, () =>
            answerScopedRace({
              request: asked,
              ctx: chatCtx(deps, now, siteRoot, asked),
            }),
          ),
        budgetMs(deps),
      );
      if ("unavailable" in answer) {
        return json({ error: "unavailable", message: answer.message }, 503);
      }
      logOutcome({
        refused: answer.refused,
        tools: ["race"],
        latencyMs: Date.now() - started,
        mode: "factual",
      });
      return json(chatBody(answer, threadId, asked.message, asked));
    } catch (error) {
      return json(unavailableBody(error), 503);
    }
  }

  if (isStateRosterQuestion(asked.message, asked.state)) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await withBudget(
        (signal) =>
          runWithReadAbort(signal, () =>
            answerStateRoster({
              request: asked,
              ctx: chatCtx(deps, now, siteRoot, asked),
            }),
          ),
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
      return json(chatBody(answer, threadId, asked.message, asked));
    } catch (error) {
      return json(unavailableBody(error), 503);
    }
  }

  const defined = definitionAnswer(asked.message);
  if (defined) {
    if (hasPlaceContext(asked)) {
      defined.answer_markdown = defined.answer_markdown.replace(
        "Name a state or race and I can look up the FEC Form 2 filings stored for it.",
        "I can look up the FEC Form 2 filings for this page.",
      );
    }
    logOutcome({ refused: false, tools: [], latencyMs: Date.now() - started, mode: "factual" });
    return json(chatBody(defined, threadId, asked.message, asked));
  }

  if (isUpcomingElectionsQuestion(asked.message)) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await answerUpcoming({
        request: asked,
        ctx: chatCtx(deps, now, siteRoot, asked),
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
      return json(chatBody(answer, threadId, asked.message, asked));
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      console.error(`Upcoming lookup failed: ${name}`);
      return json({ error: "unavailable", message: "Stored records are unavailable." }, 503);
    }
  }

  const chamber = askedChamber(asked.message);
  if (
    isVagueRunningQuestion(asked.message) &&
    !asked.candidateId &&
    (asked.state || asked.zip || asked.raceId) &&
    (!asked.raceId || chamber === "senate" || chamber === "house")
  ) {
    const siteRoot =
      deps.siteRoot ?? `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
    try {
      const answer = await withBudget(
        (signal) =>
          runWithReadAbort(signal, () =>
            answerKnownPlace({
              request: asked,
              ctx: chatCtx(deps, now, siteRoot, asked),
            }),
          ),
        budgetMs(deps),
      );
      if ("unavailable" in answer) {
        return json({ error: "unavailable", message: answer.message }, 503);
      }
      logOutcome({
        refused: answer.refused,
        tools: ["place"],
        latencyMs: Date.now() - started,
        mode: "factual",
      });
      return json(chatBody(answer, threadId, asked.message, asked));
    } catch (error) {
      return json(unavailableBody(error), 503);
    }
  }

  if (needsRaceClarification(asked)) {
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
        asked.message,
        asked,
      ),
    );
  }

  const siteRoot =
    deps.siteRoot ??
    `${originFromRequest(request)}${basePathFromEnv(deps.env)}`;
  const budget = budgetMs(deps);
  try {
    let answer = await withBudget(
      (signal) =>
        runWithReadAbort(signal, () =>
          runGroundedChat({
            request: asked,
            env: deps.env,
            converse: deps.converse ?? createBedrockConverse(deps.env),
            deadlineMs: Date.now() + budget,
            signal,
            ctx: chatCtx(deps, now, siteRoot, asked),
          }),
        ),
      budget,
    );
    if (asksForAnotherState(answer.answer_markdown) && hasPlaceContext(asked)) {
      const replaced = isSingleContestScope(asked)
        ? await answerScopedRace({
            request: asked,
            ctx: chatCtx(deps, now, siteRoot, asked),
          })
        : await answerKnownPlace({
            request: asked,
            ctx: chatCtx(deps, now, siteRoot, asked),
          });
      if (!("unavailable" in replaced)) answer = { ...answer, ...replaced };
    }
    logOutcome({
      refused: answer.refused,
      tools: answer.tools,
      latencyMs: Date.now() - started,
      modelId: answer.modelId,
      inputTokens: answer.usage.inputTokens,
      outputTokens: answer.usage.outputTokens,
    });
    return json(chatBody(answer, threadId, asked.message, asked));
  } catch (error) {
    return json(unavailableBody(error), 503);
  }
}

function chatBody(
  answer: ChatAnswer,
  threadId: string,
  priorMessage: string,
  asked?: ChatRequest,
) {
  const polished = limitAnswerToRaceScope(
    polishChatAnswer(answer, priorMessage, asked ? answerScope(asked) : undefined),
    asked ?? { message: priorMessage },
  );
  const refreshedAt = polished.refreshedAt;
  return {
    answer_markdown: polished.answer_markdown,
    sources: polished.sources.map((source) => alignSourceAsOf(source, refreshedAt)),
    refused: polished.refused,
    mode: polished.mode ?? "factual",
    threadId,
    ...(polished.refreshedAt !== undefined ? { refreshedAt: polished.refreshedAt } : {}),
  };
}

const processBootedAt = Date.now();
let firstAskBudget = true;

function budgetMs(deps: ChatDeps): number {
  const configured = deps.budgetMs ?? chatBudgetMs(deps.env);
  if (deps.budgetMs != null) return configured;
  const firstRequest = firstAskBudget;
  firstAskBudget = false;
  return coldAskBudgetMs({
    configured,
    bootedAt: processBootedAt,
    now: Date.now(),
    firstRequest,
  });
}

/**
 * Live Ask reuses the race, candidate list, and watermark the page just read.
 * Tests use an in-memory repository and always hit that store.
 */
function askRepository(repo: ApiRepository): ApiRepository {
  if (!isLiveRepository(repo)) return repo;
  return {
    listRacesByCycle: (cycle) => repo.listRacesByCycle(cycle),
    getRace: (raceId) => rosterRead(rosterCacheKey("race", raceId), () => repo.getRace(raceId)),
    getCandidate: (candidateId) => repo.getCandidate(candidateId),
    listCandidatesForRace: (raceId) =>
      rosterRead(rosterCacheKey("candidates", raceId), () => repo.listCandidatesForRace(raceId)),
    listFilingsForCandidate: (candidateId) => repo.listFilingsForCandidate(candidateId),
    getWatermark: () => rosterRead(rosterCacheKey("watermark"), () => repo.getWatermark()),
  };
}

function chatCtx(deps: ChatDeps, now: Date, siteRoot: string, asked: ChatRequest) {
  const root = (deps.siteRoot ?? siteRoot).replace(/\/+$/, "");
  const state = asked.state ?? stateFromRaceId(asked.raceId) ?? undefined;
  const cycle = asked.cycle ?? yearFromRaceId(asked.raceId) ?? undefined;
  const locked = isSingleContestScope(asked);
  const office = locked ? chamberFromRaceId(asked.raceId) ?? undefined : undefined;
  return {
    repo: askRepository(deps.repository()),
    env: deps.env,
    now,
    root,
    ...(cycle != null ? { cycle } : {}),
    ...(state ? { state } : {}),
    ...(asked.zip ? { zip: asked.zip } : {}),
    ...(locked && asked.raceId ? { raceId: asked.raceId } : {}),
    ...(office ? { office } : {}),
  };
}

function answerScope(asked: ChatRequest): AnswerScope | undefined {
  const locked = isSingleContestScope(asked);
  const office = locked ? chamberFromRaceId(asked.raceId) ?? undefined : undefined;
  const cycle = asked.cycle ?? yearFromRaceId(asked.raceId) ?? undefined;
  const state = asked.state ?? stateFromRaceId(asked.raceId) ?? undefined;
  if (cycle == null && !office && !state) return undefined;
  return {
    ...(cycle != null ? { cycle } : {}),
    ...(office ? { office } : {}),
    ...(state ? { state } : {}),
  };
}

/** Fill `state` from a page ZIP when the client did not send a postal code. */
async function withZipState(asked: ChatRequest, deps: ChatDeps): Promise<ChatRequest> {
  if (asked.state || !asked.zip) return asked;
  if (stateFromRaceId(asked.raceId)) return asked;
  const lookup = deps.lookupZip ?? censusZipDistricts;
  try {
    const hit = await lookup(asked.zip);
    if (!hit?.state) return asked;
    return { ...asked, state: hit.state };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error(`ZIP context lookup failed: ${name}`);
    return asked;
  }
}

function withBudget<T>(
  work: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  budget: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      if (settled) return;
      controller.abort();
      reject(new ChatUnavailableError(CHAT_TIMEOUT_MESSAGE, "timeout"));
    }, budget);
  });
  const promise = typeof work === "function" ? work(controller.signal) : work;
  const guarded = promise.then(
    (value) => {
      settled = true;
      return value;
    },
    (error: unknown) => {
      settled = true;
      if (controller.signal.aborted || isAbortError(error)) {
        throw new ChatUnavailableError(CHAT_TIMEOUT_MESSAGE, "timeout");
      }
      throw error;
    },
  );
  void guarded.catch(() => {});
  return Promise.race([guarded, timeout]).finally(() => {
    settled = true;
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
