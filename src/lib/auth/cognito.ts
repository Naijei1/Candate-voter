import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import { cognitoSettings, type CognitoSettings } from "./cognito-settings";

export { cognitoSettings, type CognitoSettings };

export function googleSignInConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.COGNITO_GOOGLE === "true" && Boolean(env.COGNITO_DOMAIN?.trim()) && cognitoSettings(env) !== null;
}

export function googleAuthorizeUrl(
  origin: string,
  env: Record<string, string | undefined> = process.env,
  returnTo: string | null = null,
): string | null {
  const settings = cognitoSettings(env);
  const domain = env.COGNITO_DOMAIN?.trim().replace(/^https:\/\//, "") ?? "";
  if (!settings || env.COGNITO_GOOGLE !== "true" || !domain) return null;
  const redirect = `${origin.replace(/\/$/, "")}/sign-in/google`;
  const url = new URL(`https://${domain}/oauth2/authorize`);
  url.searchParams.set("identity_provider", "Google");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", settings.clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", "openid email profile");
  if (returnTo) url.searchParams.set("state", returnTo);
  return url.toString();
}

export function passwordError(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use upper case, lower case, and a number.";
  }
  return null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  return email;
}

let client: CognitoIdentityProviderClient | null = null;

function cognitoClient(settings: CognitoSettings): CognitoIdentityProviderClient {
  if (!client) client = new CognitoIdentityProviderClient({ region: settings.region });
  return client;
}

export async function signUp(settings: CognitoSettings, email: string, password: string): Promise<void> {
  await cognitoClient(settings).send(
    new SignUpCommand({
      ClientId: settings.clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    }),
  );
}

export async function confirmSignUp(settings: CognitoSettings, email: string, code: string): Promise<void> {
  await cognitoClient(settings).send(
    new ConfirmSignUpCommand({
      ClientId: settings.clientId,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function signIn(
  settings: CognitoSettings,
  email: string,
  password: string,
): Promise<{ idToken: string; refreshToken: string }> {
  const result = await cognitoClient(settings).send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: settings.clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  const idToken = result.AuthenticationResult?.IdToken;
  const refreshToken = result.AuthenticationResult?.RefreshToken;
  if (!idToken || !refreshToken) throw new Error("Cognito did not return tokens");
  return { idToken, refreshToken };
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

export type VerifiedUser = { sub: string; email: string; emailVerified: boolean; groups: string[] };

export async function verifyIdToken(
  settings: CognitoSettings,
  token: string,
): Promise<VerifiedUser | null> {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: settings.userPoolId,
      tokenUse: "id",
      clientId: settings.clientId,
    });
  }
  try {
    const payload = await verifier.verify(token);
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!payload.sub || !email) return null;
    const groups = payload["cognito:groups"];
    return {
      sub: payload.sub,
      email,
      emailVerified: payload.email_verified === true,
      groups: Array.isArray(groups) ? groups.filter((group) => typeof group === "string") : [],
    };
  } catch {
    return null;
  }
}
