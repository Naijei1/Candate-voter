import { parseMediaSlot, mediaBucketName, readBrandObject } from "@/lib/content/media";
import { loadSiteCopy } from "@/lib/content/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slot: string }> };

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const slot = parseMediaSlot((await params).slot);
  if (!slot) return new Response(null, { status: 404 });
  const bucket = mediaBucketName();
  if (!bucket) return new Response(null, { status: 404 });
  const copy = await loadSiteCopy();
  const key = slot === "logo" ? copy.logoKey : slot === "hero" ? copy.heroKey : copy.founderKey;
  if (!key) return new Response(null, { status: 404 });
  try {
    const object = await readBrandObject(bucket, key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(Buffer.from(object.body), {
      headers: {
        "content-type": object.contentType,
        "cache-control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("media read failed:", error instanceof Error ? error.name : "Error");
    return new Response(null, { status: 404 });
  }
}
