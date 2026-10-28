/**
 * Claude Haiku 5.5 on Bedrock is invoked through a cross-region inference
 * profile. The foundation-model id `anthropic.claude-haiku-5-5` is not
 * on-demand. From us-east-1 the US geo profile stays in US regions.
 * Checked against the Bedrock model card, October 2026.
 */
export const DEFAULT_HAIKU_MODEL_ID = "us.anthropic.claude-haiku-5-5";

/** Optional quality model. Same profile rule as Haiku. */
export const DEFAULT_SONNET_MODEL_ID = "us.anthropic.claude-sonnet-5-5";

export const CHAT_PROMPT_VERSION = "2026-10-28.2";

/**
 * Wall clock for one Ask request after the process is up, including Bedrock
 * calls and tool reads. Default 20s. The browser aborts at 25s
 * (`CHAT_TIMEOUT_MS` in `browser.ts`). A cold process shortens this budget
 * by time already spent booting so the handler can still return 503
 * `code: "timeout"` before that abort. Bedrock SDK retries are off
 * (`maxAttempts: 1`). Override with `CANDATE_CHAT_BUDGET_MS` (3000–25000).
 * Tool rounds are capped at 3 in the Converse loop.
 */
export const DEFAULT_CHAT_BUDGET_MS = 20_000;

/** Ask panel abort. Kept here so the server budget can see it. Do not raise it. */
export const ASK_CLIENT_ABORT_MS = 25_000;

const COLD_RESPONSE_SLACK_MS = 2_000;
const COLD_BUDGET_FLOOR_MS = 800;

/**
 * Budget for one Ask call.
 * The first call on a process that just booted has already used part of the
 * browser's 25s. Later calls, and a process that has been up longer than
 * that abort, use `configured` (the client's clock started with the request).
 */
export function coldAskBudgetMs(input: {
  configured: number;
  bootedAt: number;
  now: number;
  firstRequest: boolean;
}): number {
  if (!input.firstRequest) return input.configured;
  const elapsed = Math.max(0, input.now - input.bootedAt);
  if (elapsed >= ASK_CLIENT_ABORT_MS) return input.configured;
  const room = ASK_CLIENT_ABORT_MS - elapsed - COLD_RESPONSE_SLACK_MS;
  if (room >= input.configured) return input.configured;
  return Math.max(COLD_BUDGET_FLOOR_MS, Math.min(input.configured, room));
}

const DEFAULT_RATE_LIMIT = 20;
const DEFAULT_RATE_WINDOW_SECONDS = 60;

export function chatEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const value = env.CANDATE_CHAT_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * Explicit viewpoint-alignment answers. Unset means on. Set to `false`,
 * `0`, or `no` to soft-refuse those asks the same way as voting advice.
 * Alignment still cannot invent positions: the stored rows are Form 2
 * filings, and the handler says so when no vote or statement fields exist.
 */
export function alignmentEnabled(
  env: Record<string, string | undefined>,
): boolean {
  const value = env.CANDATE_CHAT_ALIGNMENT?.trim().toLowerCase();
  if (value == null || value === "") return true;
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

export function chatBudgetMs(env: Record<string, string | undefined>): number {
  return boundedInt(env.CANDATE_CHAT_BUDGET_MS, DEFAULT_CHAT_BUDGET_MS, 3_000, 25_000);
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
