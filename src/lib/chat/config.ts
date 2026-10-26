/**
 * Claude Haiku 5.5 on Bedrock is invoked through a cross-region inference
 * profile. The foundation-model id `anthropic.claude-haiku-5-5` is not
 * on-demand. From us-east-1 the US geo profile stays in US regions.
 * Checked against the Bedrock model card, October 2026.
 */
export const DEFAULT_HAIKU_MODEL_ID = "us.anthropic.claude-haiku-5-5";

/** Optional quality model. Same profile rule as Haiku. */
export const DEFAULT_SONNET_MODEL_ID = "us.anthropic.claude-sonnet-5-5";

export const CHAT_PROMPT_VERSION = "2026-10-26.1";

const DEFAULT_RATE_LIMIT = 20;
const DEFAULT_RATE_WINDOW_SECONDS = 60;

export function chatEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const value = env.CANDATE_CHAT_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * `CANDATE_CHAT_MODEL=sonnet` selects Sonnet. Any other value, including
 * unset, selects Haiku. `BEDROCK_MODEL_ID` overrides the Haiku id.
 * `BEDROCK_SONNET_MODEL_ID` overrides the Sonnet id.
 */
export function chatModelId(env: Record<string, string | undefined>): string {
  const choice = env.CANDATE_CHAT_MODEL?.trim().toLowerCase();
  if (choice === "sonnet") {
    return env.BEDROCK_SONNET_MODEL_ID?.trim() || DEFAULT_SONNET_MODEL_ID;
  }
  return env.BEDROCK_MODEL_ID?.trim() || DEFAULT_HAIKU_MODEL_ID;
}

export function rateLimitSettings(env: Record<string, string | undefined>): {
  limit: number;
  windowMs: number;
} {
  return {
    limit: boundedInt(env.CANDATE_CHAT_RATE_LIMIT, DEFAULT_RATE_LIMIT, 1, 1000),
    windowMs:
      boundedInt(
        env.CANDATE_CHAT_RATE_WINDOW_SECONDS,
        DEFAULT_RATE_WINDOW_SECONDS,
        1,
        3600,
      ) * 1000,
  };
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value == null || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value.trim());
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}
