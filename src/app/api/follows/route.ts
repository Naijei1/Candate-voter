import { currentUser } from "@/lib/auth/session";
import { parseFollowId, parseFollowType } from "@/lib/users/alerts";
import { deleteFollow, listFollows, saveFollow } from "@/lib/users/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  try {
    const follows = await listFollows(user.sub);
    return Response.json({ follows });
  } catch (error) {
    console.error("list follows failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ reason: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  return writeFollow(request, "save");
}

export async function DELETE(request: Request): Promise<Response> {
  return writeFollow(request, "delete");
}

async function writeFollow(request: Request, mode: "save" | "delete"): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  const body = await readBody(request);
  const targetType = parseFollowType(body?.targetType);
  const targetId = parseFollowId(body?.targetId);
  if (!targetType || !targetId) return Response.json({ reason: "bad_request" }, { status: 400 });
  try {
    if (mode === "delete") await deleteFollow(user.sub, targetType, targetId);
    else {
      await saveFollow({
        userId: user.sub,
        targetType,
        targetId,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("follow write failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ reason: "unavailable", message: "Could not save this follow." }, { status: 503 });
  }
  return Response.json({ ok: true });
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
