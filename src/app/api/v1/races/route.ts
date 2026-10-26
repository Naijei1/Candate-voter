import { liveApiDeps } from "@/lib/api/deps";
import { getRaces } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return getRaces(request, liveApiDeps());
}
