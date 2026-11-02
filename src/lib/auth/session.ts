import { cookies } from "next/headers";
import { cognitoSettings, verifyIdToken } from "./cognito";

export const ID_COOKIE = "candate_id";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function currentUser(): Promise<{ sub: string; email: string } | null> {
  const jar = await cookies();
  const settings = cognitoSettings();
  if (!settings) return null;
  const token = jar.get(ID_COOKIE)?.value;
  if (!token) return null;
  return verifyIdToken(settings, token);
}

export async function setIdCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(ID_COOKIE, token, { ...baseCookie, maxAge: 60 * 60 });
}

export async function clearIdCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(ID_COOKIE, "", { ...baseCookie, maxAge: 0 });
}
