import { cognitoSettings, normalizeEmail, signIn } from "@/lib/auth/cognito";
import { cognitoFailure, notConfigured } from "@/lib/auth/errors";
import { setIdCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const settings = cognitoSettings();
  if (!settings) return notConfigured();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const email = normalizeEmail(record?.email);
  const password = typeof record?.password === "string" ? record.password : "";
  if (!email || !password) {
    return Response.json({ ok: false, reason: "bad_request", message: "Enter email and password." }, { status: 400 });
  }
  try {
    const tokens = await signIn(settings, email, password);
    await setIdCookie(tokens.idToken);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("sign-in failed:", error instanceof Error ? error.name : "Error");
    const failure = cognitoFailure(error);
    return Response.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}
