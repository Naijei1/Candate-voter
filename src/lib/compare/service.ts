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

export type CompareResult = { status: number; body: CompareSummary & { error?: "rate_limited"; message?: string }; headers?: Record<string, string> };

export type CompareService = {
  handle(raceId: string, clientKey: string): Promise<CompareResult | null>;
};

/**
 * Cache, single-flight, and caps for the home comparison.
 * Order: cached answer, shared in-flight answer, per-address cap, global cap, then one model call.
 */
export function createCompareService(deps: {
  summarize: (basis: CompareBasis) => Promise<CompareSummary>;
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
    async handle(raceId, clientKey) {
      const basis = compareBasis(raceId);
      if (!basis) return null;
      const hit = cache.get(raceId);
      if (hit && now() < hit.until) return { status: 200, body: hit.body };
      const inFlight = pending.get(raceId);
      if (inFlight) return inFlight;
      for (const [limiter, key] of [
        [deps.limiter, `compare:${clientKey}`],
        [deps.globalLimiter, "compare:all"],
      ] as const) {
        const decision = await limiter.take(key, now());
        if (!decision.ok) {
          return {
            status: 429,
            body: recordsOnlySummary(basis, "Too many requests. Try again in a minute."),
            headers: { "retry-after": String(decision.retryAfterSeconds) },
          };
        }
      }
      return singleFlight(pending, raceId, async (): Promise<CompareResult> => {
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
        const summary = await deps.summarize(basis);
        cache.set(raceId, { until: now() + (summary.mode === "ai" ? AI_CACHE_MS : FALLBACK_CACHE_MS), body: summary });
        return { status: 200, body: summary };
      });
    },
  };
}
