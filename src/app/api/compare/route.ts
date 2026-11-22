import { trustedClientAddress } from "@/lib/chat/rate-limit";
import { liveCompare } from "@/lib/compare/live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const raceId = new URL(request.url).searchParams.get("race") ?? "";
  const result = await liveCompare.handle(raceId, trustedClientAddress(request));
  if (!result) return Response.json({ error: "Unknown race." }, { status: 404 });
  return Response.json(result.body, { status: result.status, headers: result.headers });
}
