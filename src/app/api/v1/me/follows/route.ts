import { json, unauthorized } from "@/lib/api/http";
import { readObject } from "@/lib/api/input";
import { meUser } from "@/lib/api/me-auth";
import { versioned } from "@/lib/api/v1-types";
import { changeFollow } from "@/lib/users/follow-actions";
import { FOLLOW_LIMIT_MESSAGE } from "@/lib/users/follows";
import { listFollows } from "@/lib/users/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const user = await meUser(request);
  if (!user) return unauthorized();
  try {
    return json(versioned({ follows: await listFollows(user.sub) }));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

export function PUT(request: Request): Promise<Response> {
  return write(request, false);
}

export function DELETE(request: Request): Promise<Response> {
  return write(request, true);
}

async function write(request: Request, remove: boolean): Promise<Response> {
  const user = await meUser(request);
  if (!user) return unauthorized();
  const body = await readObject(request);
  try {
    const result = await changeFollow(user.sub, body, remove);
    if (result === "follow_limit") return json({ error: result, message: FOLLOW_LIMIT_MESSAGE }, 409);
    if (result === "bad_request") return json({ error: result }, 400);
    return json(versioned({ ok: true }));
  } catch (error) {
    console.error("follow write failed", error instanceof Error ? error.name : "Error");
    return json({ error: "unavailable" }, 503);
  }
}
