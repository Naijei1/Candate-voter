import { adminActor } from "@/lib/auth/guard";
import { getSiteCopy, saveSiteCopy } from "@/lib/content/store";
import {
  brandObjectKey,
  isBrandKey,
  MAX_MEDIA_BYTES,
  mediaBucketName,
  parseMediaSlot,
  presignBrandUpload,
} from "@/lib/content/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const admin = await adminActor();
  if (!admin) return Response.json({ message: "Sign in with an admin account." }, { status: 401 });
  const bucket = mediaBucketName();
  if (!bucket) return Response.json({ message: "Image storage is not set up." }, { status: 503 });
  const body = await readBody(request);
  const slot = parseMediaSlot(body?.slot);
  const contentType = body?.contentType === "image/jpeg" ? "image/jpeg" : null;
  const bytes = typeof body?.bytes === "number" ? body.bytes : 0;
  if (!slot || !contentType || bytes < 1 || bytes > MAX_MEDIA_BYTES) {
    return Response.json({ message: "Use a JPEG under 2 MB." }, { status: 400 });
  }
  const key = brandObjectKey(slot, contentType);
  if (!key) return Response.json({ message: "Use a JPEG under 2 MB." }, { status: 400 });
  try {
    const uploadUrl = await presignBrandUpload({ bucket, key, contentType });
    return Response.json({ uploadUrl, key });
  } catch (error) {
    console.error("presign failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "Image storage is not set up." }, { status: 503 });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const admin = await adminActor();
  if (!admin) return Response.json({ message: "Sign in with an admin account." }, { status: 401 });
  const body = await readBody(request);
  const slot = parseMediaSlot(body?.slot);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!slot || !isBrandKey(slot, key)) return Response.json({ message: "That image key is not allowed." }, { status: 400 });
  try {
    const copy = await getSiteCopy();
    if (slot === "logo") copy.logoKey = key;
    if (slot === "hero") copy.heroKey = key;
    if (slot === "founder") copy.founderKey = key;
    copy.updatedAt = new Date().toISOString();
    copy.updatedBy = admin.email;
    await saveSiteCopy(copy);
  } catch (error) {
    console.error("media attach failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "The image was not attached." }, { status: 503 });
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
