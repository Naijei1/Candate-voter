import { liveApiDeps } from "@/lib/api/deps";
import { getCandidateFilings } from "@/lib/api/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { candidateId } = await context.params;
  return getCandidateFilings(request, candidateId, liveApiDeps());
}
