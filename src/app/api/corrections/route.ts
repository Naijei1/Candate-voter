import { randomUUID } from "node:crypto";
import { createDynamoRepository } from "@/lib/data/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_NOTE = 2000;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ stored: false, reason: "bad_request" }, { status: 400 });
  }
  const note = readNote(body);
  if (!note) return Response.json({ stored: false, reason: "bad_request" }, { status: 400 });
  const record = body as Record<string, unknown>;
  const correction = {
    correctionId: randomUUID(),
    raceId: shortId(record.raceId),
    candidateId: shortId(record.candidateId),
    note,
    createdAt: new Date().toISOString(),
  };
  try {
    await createDynamoRepository().saveCorrection(correction);
  } catch (error) {
    console.error(
      "correction write failed:",
      error instanceof Error ? error.name : "Error",
    );
    return Response.json({
      stored: false,
      reason: "not_permitted",
      message: "Not saved. This site can read filings but cannot store corrections yet.",
    });
  }
  return Response.json({
    stored: true,
    message: "Saved for review. It is not published on the race page.",
  });
}

function readNote(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const note = (body as { note?: unknown }).note;
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
