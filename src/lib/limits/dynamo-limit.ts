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

export function createAiLimits(
  env: Record<string, string | undefined> = process.env,
  dynamo: CounterClient = (client ??= DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
  }))),
): { perIp: RateLimiter; daily: RateLimiter } {
  const configuredCap = Number(env.CANDATE_AI_DAILY_CAP);
  const dailyCap = Number.isSafeInteger(configuredCap) && configuredCap > 0 ? configuredCap : 2000;
  const { limit, windowMs } = rateLimitSettings(env);
  const table = usersTableName(env);

  function counter(cap: number, duration: number, daily: boolean): RateLimiter {
    return {
      async take(key, nowMs) {
        const start = Math.floor(nowMs / duration) * duration;
        const end = start + duration;
        const retryAfterSeconds = Math.ceil((end - nowMs) / 1000);
        try {
          const { Attributes } = await dynamo.send(new UpdateCommand({
            TableName: table,
            Key: {
              pk: daily ? "LIMIT#ai#daily" : `LIMIT#ip#${key}`,
              sk: daily ? new Date(start).toISOString().slice(0, 10) : String(start),
            },
            UpdateExpression: "SET #ttl = if_not_exists(#ttl, :exp) ADD hits :one",
            ExpressionAttributeNames: { "#ttl": "ttl" },
            ExpressionAttributeValues: { ":exp": Math.ceil(end / 1000), ":one": 1 },
            ReturnValues: "UPDATED_NEW",
          }));
          const hits = Attributes?.hits;
          if (typeof hits !== "number") throw new Error("Missing counter value");
          return hits <= cap ? { ok: true } : { ok: false, retryAfterSeconds };
        } catch {
          console.warn(daily ? "AI daily counter unavailable" : "AI per-IP counter unavailable");
          return daily ? { ok: false, retryAfterSeconds } : { ok: true };
        }
      },
    };
  }

  return { perIp: counter(limit, windowMs, false), daily: counter(dailyCap, DAY_MS, true) };
}
