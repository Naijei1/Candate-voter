import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { rateLimitSettings } from "../chat/config";
import type { RateLimiter } from "../chat/rate-limit";
import { usersTableName } from "../users/store";

const DAY_MS = 86_400_000;
export const DAILY_LIMIT_MESSAGE = "Ask is busy today. Try again tomorrow.";

type CounterClient = {
  send(command: UpdateCommand): Promise<{ Attributes?: Record<string, unknown> }>;
};

let client: CounterClient | undefined;

export function createCounterLimiter(
  { scope, limit, windowMs, failOpen }: {
    scope: string;
    limit: number;
    windowMs: number;
    failOpen: boolean;
  },
  env: Record<string, string | undefined> = process.env,
  dynamo: CounterClient = (client ??= DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
  }))),
): RateLimiter {
  const table = usersTableName(env);
  return {
    async take(key, nowMs) {
      const start = Math.floor(nowMs / windowMs) * windowMs;
      const end = start + windowMs;
      const retryAfterSeconds = Math.ceil((end - nowMs) / 1000);
      try {
        const { Attributes } = await dynamo.send(new UpdateCommand({
          TableName: table,
          Key: {
            pk: key ? `LIMIT#${scope}#${key}` : `LIMIT#${scope}`,
            sk: !key && windowMs === DAY_MS ? new Date(start).toISOString().slice(0, 10) : String(start),
          },
          UpdateExpression: "SET #ttl = if_not_exists(#ttl, :exp) ADD hits :one",
          ExpressionAttributeNames: { "#ttl": "ttl" },
          ExpressionAttributeValues: { ":exp": Math.ceil(end / 1000), ":one": 1 },
          ReturnValues: "UPDATED_NEW",
        }));
        const hits = Attributes?.hits;
        if (typeof hits !== "number") throw new Error("Missing counter value");
        return hits <= limit ? { ok: true } : { ok: false, retryAfterSeconds };
      } catch {
        console.warn(`Counter unavailable: ${scope}`);
        return failOpen ? { ok: true } : { ok: false, retryAfterSeconds };
      }
    },
  };
}

export function createAiLimits(
  env: Record<string, string | undefined> = process.env,
  dynamo?: CounterClient,
): { perIp: RateLimiter; daily: RateLimiter } {
  const configuredCap = Number(env.CANDATE_AI_DAILY_CAP);
  const dailyCap = Number.isSafeInteger(configuredCap) && configuredCap > 0 ? configuredCap : 2000;
  const { limit, windowMs } = rateLimitSettings(env);
  const daily = createCounterLimiter({ scope: "ai#daily", limit: dailyCap, windowMs: DAY_MS, failOpen: false }, env, dynamo);
  return {
    perIp: createCounterLimiter({ scope: "ip", limit, windowMs, failOpen: true }, env, dynamo),
    daily: { take: (_key, nowMs) => daily.take("", nowMs) },
  };
}

export function createCorrectionLimits(env = process.env, dynamo?: CounterClient) {
  return {
    perIp: createCounterLimiter({ scope: "corrections#ip", limit: 5, windowMs: 3_600_000, failOpen: true }, env, dynamo),
    daily: createCounterLimiter({ scope: "corrections#daily", limit: 200, windowMs: DAY_MS, failOpen: false }, env, dynamo),
  };
}
