import { randomUUID } from "node:crypto";
import { trustedClientAddress, type RateLimiter } from "./chat/rate-limit";
import type { StoredCorrection } from "./data/repository";

const MAX_NOTE = 2000;

export async function postCorrection(request: Request, deps: {
  perIp: RateLimiter;
  daily: RateLimiter;
  save: (correction: StoredCorrection) => Promise<void>;
  now?: () => number;
}): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ stored: false, reason: "bad_request" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (typeof record.website === "string" && record.website.length > 0) return success();
  const note = readNote(record.note);
  if (!note) return Response.json({ stored: false, reason: "bad_request" }, { status: 400 });
  const now = deps.now?.() ?? Date.now();
  const ip = await deps.perIp.take(trustedClientAddress(request), now);
  const decision = ip.ok ? await deps.daily.take("", now) : ip;
  if (!decision.ok) {
    return Response.json({ stored: false, message: "Too many notes. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(decision.retryAfterSeconds) },
    });
  }
  const correction: StoredCorrection = {
    correctionId: randomUUID(),
    raceId: shortId(record.raceId),
    candidateId: shortId(record.candidateId),
    note,
    createdAt: new Date(now).toISOString(),
    status: "new",
    statusLog: [],
  };
  try {
    await deps.save(correction);
  } catch (error) {
    console.error(
      "correction write failed:",
      error instanceof Error ? error.name : "Error",
    );
    return Response.json({
      stored: false,
      reason: "not_permitted",
      message: "Couldn't send. Try again.",
    }, { status: 503 });
  }
  return success();
}

function success(): Response {
  return Response.json({
    stored: true,
    message: "Saved for review. It is not published on the race page.",
  });
}

function readNote(note: unknown): string | null {
  if (typeof note !== "string") return null;
  const text = note.trim();
  if (!text || text.length > MAX_NOTE) return null;
  return text;
}

function shortId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 80) return null;
  return text;
}
