import { basePathFromEnv } from "@/lib/base-path";
import { openApiDocument } from "@/lib/api/openapi-document";
import { originFromRequest } from "@/lib/api/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  const serverUrl = `${originFromRequest(request)}${basePathFromEnv()}`;
  return new Response(openApiDocument(serverUrl), {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
