import { chatEnabled, chatModelId } from "@/lib/chat/config";
import { createBedrockConverse } from "@/lib/chat/converse";
import { createRateLimiter } from "@/lib/chat/rate-limit";
import { createAiLimits } from "@/lib/limits/dynamo-limit";
import { candidatesWithEvidence } from "./evidence";
import { createCompareService, MODEL_CALLS_PER_MINUTE } from "./service";
import { summarizeRace } from "./summarize";

const converse = chatEnabled(process.env) ? createBedrockConverse(process.env) : null;
const limits = createAiLimits();

export const liveCompare = createCompareService({
  limiter: limits.perIp,
  dailyLimiter: limits.daily,
  usesModel: (basis) => converse !== null && candidatesWithEvidence(basis) >= 2,
  globalLimiter: createRateLimiter({ limit: MODEL_CALLS_PER_MINUTE, windowMs: 60_000 }),
  async summarize(basis, budgetMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgetMs);
    try {
      return await summarizeRace(basis, { converse, modelId: chatModelId(process.env), signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  },
});
