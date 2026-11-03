import { cognitoSettings } from "@/lib/auth/cognito";
import { setIdCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const settings = cognitoSettings();
  const domain = process.env.COGNITO_DOMAIN?.trim().replace(/^https:\/\//, "") ?? "";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const back = new URL("/sign-in", url.origin);
  if (!settings || !domain || !code || process.env.COGNITO_GOOGLE !== "true") {
    return Response.redirect(back);
  }
  const redirectUri = `${url.origin}/sign-in/google`;
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
    const payload = (await tokenResponse.json()) as { id_token?: unknown };
    if (!tokenResponse.ok || typeof payload.id_token !== "string") return Response.redirect(back);
    await setIdCookie(payload.id_token);
    return Response.redirect(new URL("/", url.origin));
  } catch {
    return Response.redirect(back);
  }
}
