import { clearIdCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  await clearIdCookie();
  return Response.json({ ok: true });
}
