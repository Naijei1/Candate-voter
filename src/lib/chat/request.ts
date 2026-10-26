import { parseCycle } from "../data/cycles";
import { isResourceId } from "../api/ids";
import type { ChatRequest } from "./types";

const THREAD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/;
const MAX_MESSAGE = 2000;

export type ParseChatResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; message: string };

export function parseChatRequest(body: unknown): ParseChatResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Request body must be a JSON object" };
  }
  const record = body as Record<string, unknown>;

  if (typeof record.message !== "string") {
    return {
      ok: false,
      message: "message must be a string from 1 to 2000 characters",
    };
  }
  const message = record.message;
  if (message.trim().length === 0 || message.length > MAX_MESSAGE) {
    return {
      ok: false,
      message: "message must be a string from 1 to 2000 characters",
    };
  }

  const raceId = optionalId(record, "raceId");
  if (!raceId.ok) return raceId;
  const candidateId = optionalId(record, "candidateId");
  if (!candidateId.ok) return candidateId;

  let cycle: number | undefined;
  if ("cycle" in record && record.cycle != null) {
    if (typeof record.cycle !== "number" || !Number.isInteger(record.cycle)) {
      return { ok: false, message: "cycle must be an integer from 1980 to 2100" };
    }
    const parsed = parseCycle(String(record.cycle));
    if (parsed == null) {
      return { ok: false, message: "cycle must be an integer from 1980 to 2100" };
    }
    cycle = parsed;
  }

  let threadId: string | undefined;
  if ("threadId" in record && record.threadId != null) {
    if (typeof record.threadId !== "string" || !THREAD_ID.test(record.threadId)) {
      return { ok: false, message: "threadId is invalid" };
    }
    threadId = record.threadId;
  }

  return {
    ok: true,
    value: {
      message,
      ...(raceId.value ? { raceId: raceId.value } : {}),
      ...(candidateId.value ? { candidateId: candidateId.value } : {}),
      ...(cycle != null ? { cycle } : {}),
      ...(threadId ? { threadId } : {}),
    },
  };
}

function optionalId(
  record: Record<string, unknown>,
  key: "raceId" | "candidateId",
): { ok: true; value?: string } | { ok: false; message: string } {
  if (!(key in record) || record[key] == null) return { ok: true };
  const value = record[key];
  if (typeof value !== "string" || !isResourceId(value)) {
    return { ok: false, message: `${key} is invalid` };
  }
  return { ok: true, value };
}
