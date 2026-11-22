import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cognitoSettings } from "../auth/cognito-settings";
import { currentUser } from "../auth/session";
import { originFromRequest } from "./public-origin";

const verifiers = new Map<string, ReturnType<typeof CognitoJwtVerifier.create>>();

async function bearerUser(token: string): Promise<{ sub: string } | null> {
  const settings = cognitoSettings();
  if (!settings) return null;
  try {
    const key = `${settings.userPoolId}:${settings.clientId}`;
    let verifier = verifiers.get(key);
    if (!verifier) {
      verifier = CognitoJwtVerifier.create({ userPoolId: settings.userPoolId, clientId: settings.clientId, tokenUse: null });
      verifiers.set(key, verifier);
    }
    const claims = await verifier.verify(token);
    return claims.sub && (claims.token_use === "access" || claims.token_use === "id") ? { sub: claims.sub } : null;
  } catch {
    return null;
  }
}

export async function meUser(request: Request, readCookie = currentUser, verifyBearer = bearerUser) {
  const auth = request.headers.get("authorization");
  if (auth !== null) {
    const match = /^Bearer (\S+)$/i.exec(auth);
    return match ? verifyBearer(match[1]) : null;
  }
  if (request.method !== "GET" && request.headers.get("origin") !== originFromRequest(request)) return null;
  return readCookie();
}
