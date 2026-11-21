import { NextResponse, type NextRequest } from "next/server";
import { cognitoSettings } from "./lib/auth/cognito-settings";
import { refreshIdToken } from "./lib/auth/cognito-session";
import { ID_COOKIE, ID_MAX_AGE, REFRESH_COOKIE, sessionCookie, shouldRefresh } from "./lib/auth/session-cookies";

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || !shouldRefresh(request.cookies.get(ID_COOKIE)?.value, refreshToken)) {
    return NextResponse.next();
  }

  const settings = cognitoSettings();
  try {
    if (!settings) throw new Error("Cognito is unavailable");
    const token = await refreshIdToken(settings, refreshToken);
    request.cookies.set(ID_COOKIE, token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(ID_COOKIE, token, { ...sessionCookie, maxAge: ID_MAX_AGE });
    return response;
  } catch {
    request.cookies.delete(ID_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
    const response = NextResponse.next({ request: { headers: request.headers } });
    for (const name of [ID_COOKIE, REFRESH_COOKIE]) {
      response.cookies.set(name, "", { ...sessionCookie, maxAge: 0 });
    }
    return response;
  }
}

export const config = {
  matcher: [{
    source: "/((?!_next/|api/auth/|sign-in/google|.*\\.[^/]+$).*)",
    has: [{ type: "cookie", key: "candate_refresh" }],
  }],
};
