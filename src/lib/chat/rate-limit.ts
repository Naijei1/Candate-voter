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

/**
 * Address for rate limits that a visitor cannot pick. Proxies append the
 * address they saw to the END of `X-Forwarded-For`, and anything before
 * that came from the visitor's own request, so only the last hop is trusted.
 * Behind a CDN this can be an edge address shared by several visitors, so
 * use it for generous per-address caps, alongside a global cap.
 */
export function trustedClientAddress(request: Request): string {
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const candidate = hops.at(-1) ?? "";
  if (!candidate || candidate.length > 128) return "unknown";
  if (!/^[A-Za-z0-9.:]+$/.test(candidate)) return "unknown";
  return candidate;
}
