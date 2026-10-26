import { createHash, timingSafeEqual } from "node:crypto";

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Compare two strings without short-circuiting on the first differing byte.
 * Digests are fixed length, so this also covers keys of different lengths.
 */
export function timingSafeStringEqual(left: string, right: string): boolean {
  const a = createHash("sha256").update(left, "utf8").digest();
  const b = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(a, b);
}

let warnedMissingKey = false;

function warnMissingKey(): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.error("CANDATE_API_KEY is not set; refusing /api/v1 requests.");
}

/**
 * Accept `Authorization: Bearer <key>` and/or `X-Api-Key: <key>`.
 * When both are sent, both must match. An empty server key never matches.
 */
export function authorizeApiRequest(
  request: Request,
  env: Record<string, string | undefined>,
): boolean {
  const expected = env.CANDATE_API_KEY?.trim() ?? "";
  if (!expected) {
    warnMissingKey();
    return false;
  }

  const authorization = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  if (authorization == null && apiKeyHeader == null) return false;

  const presented: string[] = [];
  if (authorization != null) {
    const match = BEARER.exec(authorization.trim());
    const token = match?.[1];
    if (!token) return false;
    presented.push(token);
  }
  if (apiKeyHeader != null) {
    const value = apiKeyHeader.trim();
    if (!value) return false;
    presented.push(value);
  }

  let ok = presented.length > 0;
  for (const value of presented) {
    const match = timingSafeStringEqual(value, expected);
    ok = ok && match;
  }
  return ok;
}
