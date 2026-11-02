import { adminActor } from "@/lib/auth/guard";
import { parseCheckId, parseCheckNote, parseCheckTarget } from "@/lib/content/checks";
import { addCheck } from "@/lib/content/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const admin = await adminActor();
  if (!admin) return Response.json({ message: "Sign in with an admin account." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Could not read that form." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const targetType = parseCheckTarget(record?.targetType);
  const targetId = parseCheckId(record?.targetId);
  const note = parseCheckNote(record?.note);
  if (!targetType || !targetId || (record?.note && note == null && record.note !== "")) {
    return Response.json({ message: "Choose a race or candidate and a short note." }, { status: 400 });
  }
  try {
    await addCheck({
      targetType,
      targetId,
      checkedAt: new Date().toISOString(),
      note,
      by: admin.email,
    });
  } catch (error) {
    console.error("check write failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "The check was not saved." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
