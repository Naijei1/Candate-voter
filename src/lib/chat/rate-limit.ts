/**
 * In-memory per-address limiter for the chat spike.
 * Amplify WEB_COMPUTE runs more than one instance, and this map is not
 * shared across them. A visitor can exceed the limit by landing on another
 * instance. Replace with a shared store before treating the cap as strict.
 */

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  take(key: string, nowMs: number): RateLimitDecision;
};

export function createRateLimiter(config: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    take(key, nowMs) {
      const windowStart = nowMs - config.windowMs;
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > windowStart);
      if (recent.length >= config.limit) {
        const oldest = recent[0] ?? nowMs;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + config.windowMs - nowMs) / 1000),
        );
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds };
      }
      recent.push(nowMs);
      hits.set(key, recent);
      if (hits.size > 5000) {
        const oldestKey = hits.keys().next().value;
        if (oldestKey !== undefined) hits.delete(oldestKey);
      }
      return { ok: true };
    },
  };
}

/** First forwarded hop, or `unknown` when the header is missing or odd. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim() ?? "";
  const candidate = first || request.headers.get("x-real-ip")?.trim() || "";
  if (!candidate || candidate.length > 128) return "unknown";
  if (!/^[A-Za-z0-9.:]+$/.test(candidate)) return "unknown";
  return candidate;
}
