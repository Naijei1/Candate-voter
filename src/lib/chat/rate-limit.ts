import { isIP } from "node:net";

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  take(key: string, nowMs: number): RateLimitDecision | Promise<RateLimitDecision>;
};

export function createRateLimiter(config: {
  limit: number;
  windowMs: number;
}): { take(key: string, nowMs: number): RateLimitDecision } {
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

/** CloudFront appends the viewer IP, then Amplify appends the edge IP. */
export function trustedClientAddress(request: Request): string {
  const hops = (request.headers.get("x-forwarded-for") ?? "").split(",");
  const candidate = (hops.at(-2) ?? hops[0]).trim();
  return isIP(candidate) ? candidate : "unknown";
}
