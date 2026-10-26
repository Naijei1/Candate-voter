import { basePathFromEnv } from "@/lib/base-path";
import { llmsText } from "@/lib/api/llms";
import { originFromRequest } from "@/lib/api/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  const body = llmsText({
    origin: originFromRequest(request),
    basePath: basePathFromEnv(),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
