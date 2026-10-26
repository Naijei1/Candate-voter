import { liveApiDeps } from "@/lib/api/deps";
import { getZipLookup } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return getZipLookup(request, liveApiDeps());
}
