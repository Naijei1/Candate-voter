import { authorizeApiRequest } from "./auth";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...JSON_HEADERS,
      "WWW-Authenticate": 'Bearer realm="candate"',
    },
  });
}

/** 401 response, or null when the request may proceed. */
export function rejectUnauthorized(
  request: Request,
  env: Record<string, string | undefined>,
): Response | null {
  if (authorizeApiRequest(request, env)) return null;
  return unauthorized();
}
