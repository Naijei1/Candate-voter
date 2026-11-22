import type { RateLimiter } from "@/lib/chat/rate-limit";
import { DAILY_LIMIT_MESSAGE } from "../limits/dynamo-limit";
import { compareBasis, type CompareBasis } from "./evidence";
import { singleFlight } from "./single-flight";
import { recordsOnlySummary, type CompareSummary } from "./summarize";

/** A model answer is reused for an hour; the records do not change between deploys. */
export const AI_CACHE_MS = 60 * 60 * 1000;
/** A failed or records-only answer is reused for five minutes, so an outage does not mean a paid retry per visitor. */
export const FALLBACK_CACHE_MS = 5 * 60 * 1000;
/** Model calls one server instance may start per minute, whoever asks. */
export const MODEL_CALLS_PER_MINUTE = 20;
const BUDGET_MS = 15_000;

export type CompareResult = { status: number; body: CompareSummary & { error?: "rate_limited"; message?: string }; headers?: Record<string, string> };

export type CompareService = {
  handle(raceId: string, clientKey: string, personIds?: readonly string[]): Promise<CompareResult | null>;
};

/**
 * Cache, single-flight, and caps for the home comparison.
 * Order: cached answer, shared in-flight answer, per-address cap, global cap, then one model call.
 */
export function createCompareService(deps: {
  summarize: (basis: CompareBasis, budgetMs: number) => Promise<CompareSummary>;
  limiter: RateLimiter;
  globalLimiter: RateLimiter;
  dailyLimiter?: RateLimiter;
  usesModel?: (basis: CompareBasis) => boolean;
  now?: () => number;
}): CompareService {
  const now = deps.now ?? Date.now;
  const cache = new Map<string, { until: number; body: CompareSummary }>();
  const pending = new Map<string, Promise<CompareResult>>();
  return {
    async handle(raceId, clientKey, personIds) {
      const deadline = now() + BUDGET_MS;
      const full = compareBasis(raceId);
      if (!full) return null;
      const people = personIds?.length ? full.people.filter((person) => personIds.includes(person.id)) : full.people;
      if (!people.length) return null;
      const selected = new Set(people.map((person) => person.id));
      const basis = people.length === full.people.length ? full : {
        ...full, people, evidence: full.evidence.filter((row) => !row.personId || selected.has(row.personId)),
      };
      const key = basis === full ? raceId : `${raceId}:${[...selected].sort().join(",")}`;
      const hit = cache.get(key);
      if (hit && now() < hit.until) return { status: 200, body: hit.body };
      const inFlight = pending.get(key);
      if (inFlight) return inFlight;
      const perIp = await deps.limiter.take(`compare:${clientKey}`, now());
      if (!perIp.ok) return tooManyRequests(basis, perIp.retryAfterSeconds);
      const filled = cache.get(key);
      if (filled && now() < filled.until) return { status: 200, body: filled.body };
      return singleFlight(pending, key, async (): Promise<CompareResult> => {
        const global = await deps.globalLimiter.take("compare:all", now());
        if (!global.ok) return tooManyRequests(basis, global.retryAfterSeconds);
        if (deps.dailyLimiter && deps.usesModel?.(basis)) {
          const decision = await deps.dailyLimiter.take("daily", now());
          if (!decision.ok) {
            return {
              status: 429,
              body: {
                ...recordsOnlySummary(basis, DAILY_LIMIT_MESSAGE),
                error: "rate_limited",
                message: DAILY_LIMIT_MESSAGE,
              },
              headers: { "retry-after": String(decision.retryAfterSeconds) },
            };
          }
        }
        const remaining = deadline - now();
        if (remaining <= 0) return { status: 200, body: recordsOnlySummary(basis, null) };
        const summary = await deps.summarize(basis, remaining);
        cache.set(key, { until: now() + (summary.mode === "ai" ? AI_CACHE_MS : FALLBACK_CACHE_MS), body: summary });
        return { status: 200, body: summary };
      });
    },
  };
}

function tooManyRequests(basis: CompareBasis, retryAfterSeconds: number): CompareResult {
  return {
    status: 429,
    body: recordsOnlySummary(basis, "Too many requests. Try again in a minute."),
    headers: { "retry-after": String(retryAfterSeconds) },
  };
}
