import { adminActor } from "@/lib/auth/guard";
import { createDynamoRepository, parseCorrectionStatus } from "@/lib/data/repository";

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
  const correctionId = typeof record?.correctionId === "string" ? record.correctionId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(correctionId)) {
    return Response.json({ message: "That report was not found." }, { status: 400 });
  }
  if (
    record?.status !== "new" &&
    record?.status !== "reviewing" &&
    record?.status !== "fixed" &&
    record?.status !== "rejected"
  ) {
    return Response.json({ message: "Choose new, reviewing, fixed, or rejected." }, { status: 400 });
  }
  const status = parseCorrectionStatus(record.status);
  try {
    const saved = await createDynamoRepository().updateCorrectionStatus(
      correctionId,
      status,
      admin.email,
      new Date().toISOString(),
    );
    if (!saved) return Response.json({ message: "That report was not found." }, { status: 404 });
  } catch (error) {
    console.error("correction status failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "Status was not saved." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
