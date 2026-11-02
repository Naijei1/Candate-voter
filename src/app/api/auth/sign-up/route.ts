import { confirmSignUp, cognitoSettings, normalizeEmail, passwordError, signUp } from "@/lib/auth/cognito";
import { cognitoFailure, notConfigured } from "@/lib/auth/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const settings = cognitoSettings();
  if (!settings) return notConfigured();
  const body = await readBody(request);
  if (!body) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email) return Response.json({ ok: false, reason: "bad_request", message: "Enter a valid email." }, { status: 400 });

  try {
    if (code) {
      if (!/^[0-9A-Za-z]{4,12}$/.test(code)) {
        return Response.json({ ok: false, reason: "bad_request", message: "Enter the code from your email." }, { status: 400 });
      }
      await confirmSignUp(settings, email, code);
      return Response.json({ ok: true, next: "sign-in" });
    }
    const problem = passwordError(password);
    if (problem) return Response.json({ ok: false, reason: "bad_request", message: problem }, { status: 400 });
    await signUp(settings, email, password);
    return Response.json({ ok: true, next: "confirm" });
  } catch (error) {
    console.error("sign-up failed:", error instanceof Error ? error.name : "Error");
    const failure = cognitoFailure(error);
    return Response.json({ ok: false, message: failure.message }, { status: failure.status });
  }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
