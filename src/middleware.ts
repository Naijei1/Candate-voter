import { NextResponse, type NextRequest } from "next/server";
import { cognitoSettings } from "./lib/auth/cognito-settings";
import { InvalidRefreshTokenError, refreshIdToken } from "./lib/auth/cognito-session";
import { ID_COOKIE, ID_MAX_AGE, REFRESH_COOKIE, sessionCookie, shouldRefresh } from "./lib/auth/session-cookies";

export async function middleware(request: NextRequest) {
  const moved = legacyRedirect(request);
  if (moved) return moved;
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
  } catch (error) {
    const names = error instanceof InvalidRefreshTokenError ? [ID_COOKIE, REFRESH_COOKIE] : [ID_COOKIE];
    for (const name of names) request.cookies.delete(name);
    const response = NextResponse.next({ request: { headers: request.headers } });
    for (const name of names) {
      response.cookies.set(name, "", { ...sessionCookie, maxAge: 0 });
    }
    return response;
  }
}

/** Old addresses. A real redirect, including the map hash, before the app renders. */
function legacyRedirect(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path !== "/map" && path !== "/updates" && path !== "/finance/example") return null;
  const url = request.nextUrl.clone();
  if (path === "/map") {
    url.pathname = "/";
    url.search = "";
    url.hash = "map";
    return NextResponse.redirect(url, 307);
  }
  if (path === "/updates") {
    const lane = url.searchParams.get("lane") === "reporting" ? "reporting" : "";
    url.pathname = "/news";
    url.search = lane ? "lane=reporting" : "";
    url.hash = "";
    return NextResponse.redirect(url, 307);
  }
  url.pathname = "/finance";
  url.search = "";
  url.hash = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    "/map",
    "/updates",
    "/finance/example",
    {
      source: "/((?!_next/|api/auth/|sign-in/google|.*\\.[^/]+$).*)",
      has: [{ type: "cookie", key: "candate_refresh" }],
    },
  ],
};
