import { liveApiDeps } from "@/lib/api/deps";
import { getRace } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ raceId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { raceId } = await context.params;
  return getRace(request, raceId, liveApiDeps());
}
