export const dynamic = "force-dynamic";

/** Uptime check target: proves the server is answering, touches nothing else. */
export function GET(): Response {
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
