import { adminActor } from "@/lib/auth/guard";
import { COPY_FIELDS, readCopyField, type SiteCopy } from "@/lib/content/copy";
import { getSiteCopy, saveSiteCopy } from "@/lib/content/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request): Promise<Response> {
  const admin = await adminActor();
  if (!admin) return Response.json({ message: "Sign in with an admin account." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Could not read that form." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ message: "Could not read that form." }, { status: 400 });
  const record = body as Record<string, unknown>;
  let current: SiteCopy;
  try {
    current = await getSiteCopy();
  } catch (error) {
    console.error("copy read failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "Site copy could not be loaded." }, { status: 503 });
  }
  for (const field of COPY_FIELDS) {
    const text = record[field];
    if (text === "" || text == null) {
      current[field] = null;
      continue;
    }
    const parsed = readCopyField(text);
    if (!parsed) return Response.json({ message: "Each field must be 2,000 characters or fewer." }, { status: 400 });
    current[field] = parsed;
  }
  current.updatedAt = new Date().toISOString();
  current.updatedBy = admin.email;
  try {
    await saveSiteCopy(current);
  } catch (error) {
    console.error("copy write failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "Not saved. This server cannot write site copy yet." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
