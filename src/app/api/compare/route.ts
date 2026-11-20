import { chatEnabled, chatModelId } from "@/lib/chat/config";
import { createBedrockConverse } from "@/lib/chat/converse";
import { createRateLimiter, trustedClientAddress } from "@/lib/chat/rate-limit";
import { createCompareService, MODEL_CALLS_PER_MINUTE } from "@/lib/compare/service";
import { createAiLimits } from "@/lib/limits/dynamo-limit";
import { candidatesWithEvidence } from "@/lib/compare/evidence";
import { summarizeRace } from "@/lib/compare/summarize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const converse = chatEnabled(process.env) ? createBedrockConverse(process.env) : null;
const BUDGET_MS = 15_000;

const limits = createAiLimits();
const service = createCompareService({
  limiter: limits.perIp,
  dailyLimiter: limits.daily,
  usesModel: (basis) => converse !== null && candidatesWithEvidence(basis) >= 2,
  globalLimiter: createRateLimiter({ limit: MODEL_CALLS_PER_MINUTE, windowMs: 60_000 }),
  async summarize(basis) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BUDGET_MS);
    try {
      return await summarizeRace(basis, { converse, modelId: chatModelId(process.env), signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  },
});

export async function GET(request: Request): Promise<Response> {
  const raceId = new URL(request.url).searchParams.get("race") ?? "";
  const result = await service.handle(raceId, trustedClientAddress(request));
  if (!result) return Response.json({ error: "Unknown race." }, { status: 404 });
  return Response.json(result.body, { status: result.status, headers: result.headers });
}
