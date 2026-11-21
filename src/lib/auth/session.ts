import { cookies } from "next/headers";
import { cognitoSettings, verifyIdToken, type VerifiedUser } from "./cognito";
import { revokeRefreshToken } from "./cognito-session";
import { ID_COOKIE, ID_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, sessionCookie } from "./session-cookies";

export async function currentUser(): Promise<VerifiedUser | null> {
  const jar = await cookies();
  const settings = cognitoSettings();
  if (!settings) return null;
  const token = jar.get(ID_COOKIE)?.value;
  if (!token) return null;
  return verifyIdToken(settings, token);
}

export async function setSessionCookies(idToken: string, refreshToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(ID_COOKIE, idToken, { ...sessionCookie, maxAge: ID_MAX_AGE });
  jar.set(REFRESH_COOKIE, refreshToken, { ...sessionCookie, maxAge: REFRESH_MAX_AGE });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(REFRESH_COOKIE)?.value;
  const settings = cognitoSettings();
  try {
    if (token && settings) await revokeRefreshToken(settings, token);
  } catch {
    console.warn("Cognito refresh token revocation failed");
  } finally {
    jar.set(ID_COOKIE, "", { ...sessionCookie, maxAge: 0 });
    jar.set(REFRESH_COOKIE, "", { ...sessionCookie, maxAge: 0 });
  }
}
