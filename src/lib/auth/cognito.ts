import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export type CognitoSettings = {
  userPoolId: string;
  clientId: string;
  region: string;
};

export function googleSignInConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.COGNITO_GOOGLE === "true" && Boolean(env.COGNITO_DOMAIN?.trim()) && cognitoSettings(env) !== null;
}

export function googleAuthorizeUrl(
  origin: string,
  env: Record<string, string | undefined> = process.env,
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
  return url.toString();
}

export function cognitoSettings(
  env: Record<string, string | undefined> = process.env,
): CognitoSettings | null {
  const userPoolId = env.COGNITO_USER_POOL_ID?.trim() ?? "";
  const clientId = env.COGNITO_CLIENT_ID?.trim() ?? "";
  const region = env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || "us-east-1";
  if (!userPoolId || !clientId) return null;
  return { userPoolId, clientId, region };
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

export async function verifyIdToken(
  settings: CognitoSettings,
  token: string,
): Promise<{ sub: string; email: string } | null> {
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
    return { sub: payload.sub, email };
  } catch {
    return null;
  }
}
