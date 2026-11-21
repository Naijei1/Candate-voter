export const ID_COOKIE = "candate_id";
export const REFRESH_COOKIE = "candate_refresh";

export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: true,
  path: "/",
};
export const ID_MAX_AGE = 60 * 60;
export const REFRESH_MAX_AGE = 30 * 24 * ID_MAX_AGE;

export function shouldRefresh(idToken: string | undefined, refreshToken: string | undefined, nowSeconds = Date.now() / 1000): boolean {
  if (!refreshToken) return false;
  const payload = idToken?.split(".")[1];
  if (!payload) return true;
  try {
    // Expiry is only a scheduling hint. currentUser verifies the signed token.
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof exp !== "number" || !Number.isFinite(exp) || exp <= nowSeconds + 60;
  } catch {
    return true;
  }
}
