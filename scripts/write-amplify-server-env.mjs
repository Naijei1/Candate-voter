import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { argv, env } from "node:process";

/**
 * Server variables Next.js can read at SSR runtime.
 * Amplify puts console env vars in the build shell only. AWS documents writing
 * the ones the server needs into `.env.production` before `next build`.
 * `FEC_API_KEY` is intentionally absent: the Next app does not call OpenFEC.
 * Chat uses the Amplify compute role for Bedrock, not a key in this file.
 */
export const AMPLIFY_SERVER_ENV_KEYS = Object.freeze([
  "CANDATE_TABLE_NAME",
  "CANDATE_API_KEY",
  "CANDATE_CYCLES",
  "AWS_REGION",
  "CANDATE_CHAT_ENABLED",
  "CANDATE_CHAT_ALIGNMENT",
  "CANDATE_CHAT_MODEL",
  "CANDATE_CHAT_RATE_LIMIT",
  "CANDATE_CHAT_RATE_WINDOW_SECONDS",
  "BEDROCK_MODEL_ID",
  "BEDROCK_SONNET_MODEL_ID",
]);

/** Prefix copied in addition to the named keys. `FEC_API_KEY` does not match. */
export const AMPLIFY_SERVER_ENV_PREFIX = "NEXT_PUBLIC_";

const UNQUOTED = /^[A-Za-z0-9._~:/+=-]+$/;

export function quoteEnvValue(value) {
  if (UNQUOTED.test(value)) return value;
  const escaped = value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("$", "\\$");
  return `"${escaped}"`;
}

/**
 * Allowlisted single-line assignments. Empty values are skipped.
 * A newline in a value throws so a secret is not written or logged.
 */
function managedKeys(source) {
  const prefixed = Object.keys(source)
    .filter((key) => key.startsWith(AMPLIFY_SERVER_ENV_PREFIX))
    .sort();
  return [...AMPLIFY_SERVER_ENV_KEYS, ...prefixed];
}

function isReplacedKey(key) {
  return (
    key === "FEC_API_KEY" ||
    AMPLIFY_SERVER_ENV_KEYS.includes(key) ||
    key.startsWith(AMPLIFY_SERVER_ENV_PREFIX)
  );
}

export function amplifyServerEnvLines(source) {
  const lines = [];
  for (const key of managedKeys(source)) {
    const value = source[key];
    if (value == null || value === "") continue;
    if (/[\r\n\0]/.test(value)) {
      throw new Error(`${key} must be a single-line value`);
    }
    lines.push(`${key}=${quoteEnvValue(value)}`);
  }
  return lines;
}

export function mergeEnvFile(existing, updates) {
  const kept = existing.split("\n").filter((line) => {
    if (!line || line.startsWith("#")) return Boolean(line);
    const key = line.split("=", 1)[0];
    return !isReplacedKey(key);
  });
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  const body = [...kept, ...updates];
  return body.length > 0 ? `${body.join("\n")}\n` : "";
}

export function writeAmplifyServerEnvFile({ filePath, env: source }) {
  const updates = amplifyServerEnvLines(source);
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const next = mergeEnvFile(existing, updates);
  if (next !== existing) writeFileSync(filePath, next);
  return next;
}

function isDirectRun() {
  return argv[1]?.endsWith("write-amplify-server-env.mjs") ?? false;
}

if (isDirectRun()) {
  try {
    writeAmplifyServerEnvFile({ filePath: ".env.production", env });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to write .env.production";
    console.error(message);
    process.exit(1);
  }
}
