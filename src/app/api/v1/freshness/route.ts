import { liveApiDeps } from "@/lib/api/deps";
import { getFreshness } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return getFreshness(request, liveApiDeps());
}
