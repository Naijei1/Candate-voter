import { originFromRequest } from "@/lib/api/public-origin";
import { cognitoSettings } from "@/lib/auth/cognito";
import { setSessionCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const origin = originFromRequest(request);
  const settings = cognitoSettings();
  const domain = process.env.COGNITO_DOMAIN?.trim().replace(/^https:\/\//, "") ?? "";
  const code = new URL(request.url).searchParams.get("code");
  const back = new URL("/sign-in", origin);
  if (!settings || !domain || !code || process.env.COGNITO_GOOGLE !== "true") {
    return Response.redirect(back);
  }
  const redirectUri = `${origin}/sign-in/google`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: settings.clientId,
    code,
    redirect_uri: redirectUri,
  });
  try {
    const tokenResponse = await fetch(`https://${domain}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await tokenResponse.json()) as { id_token?: unknown; refresh_token?: unknown };
    if (!tokenResponse.ok || typeof payload.id_token !== "string" || typeof payload.refresh_token !== "string") return Response.redirect(back);
    await setSessionCookies(payload.id_token, payload.refresh_token);
    return Response.redirect(new URL("/", origin));
  } catch {
    return Response.redirect(back);
  }
}
