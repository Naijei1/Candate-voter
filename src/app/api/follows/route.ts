import { currentUser } from "@/lib/auth/session";
import { changeFollow } from "@/lib/users/follow-actions";
import { listFollows } from "@/lib/users/store";

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
  try {
    if (!await changeFollow(user.sub, body, mode === "delete")) {
      return Response.json({ reason: "bad_request" }, { status: 400 });
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
