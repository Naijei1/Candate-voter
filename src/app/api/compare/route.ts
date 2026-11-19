import { chatEnabled, chatModelId, rateLimitSettings } from "@/lib/chat/config";
import { createBedrockConverse } from "@/lib/chat/converse";
import { clientAddress, createRateLimiter } from "@/lib/chat/rate-limit";
import { compareBasis } from "@/lib/compare/evidence";
import { recordsOnlySummary, summarizeRace, type CompareSummary } from "@/lib/compare/summarize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = createRateLimiter(rateLimitSettings(process.env));
const converse = chatEnabled(process.env) ? createBedrockConverse(process.env) : null;
/** The records behind a race change only when the repo data changes, so one answer per race per hour is enough. */
const cache = new Map<string, { at: number; body: CompareSummary }>();
const CACHE_MS = 60 * 60 * 1000;
const BUDGET_MS = 15_000;

export async function GET(request: Request): Promise<Response> {
  const raceId = new URL(request.url).searchParams.get("race") ?? "";
  const basis = compareBasis(raceId);
  if (!basis) return Response.json({ error: "Unknown race." }, { status: 404 });
  const hit = cache.get(raceId);
  if (hit && Date.now() - hit.at < CACHE_MS) return Response.json(hit.body);
  const decision = limiter.take(`compare:${clientAddress(request)}`, Date.now());
  if (!decision.ok) {
    return Response.json(recordsOnlySummary(basis, "Too many requests. Try again in a minute."), {
      status: 429,
      headers: { "retry-after": String(decision.retryAfterSeconds) },
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  try {
    const body = await summarizeRace(basis, { converse, modelId: chatModelId(process.env), signal: controller.signal });
    if (body.mode === "ai") cache.set(raceId, { at: Date.now(), body });
    return Response.json(body);
  } finally {
    clearTimeout(timer);
  }
}
