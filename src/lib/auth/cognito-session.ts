import type { CognitoSettings } from "./cognito-settings";

export class InvalidRefreshTokenError extends Error {}

async function cognitoRequest(settings: CognitoSettings, action: string, body: object): Promise<Response> {
  const response = await fetch(`https://cognito-idp.${settings.region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
      "Content-Type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    if (action === "InitiateAuth" && await rejectsRefreshToken(response)) {
      throw new InvalidRefreshTokenError("Cognito rejected the refresh token");
    }
    throw new Error(`Cognito ${action} failed (${response.status})`);
  }
  return response;
}

async function rejectsRefreshToken(response: Response): Promise<boolean> {
  if (![400, 401, 403].includes(response.status)) return false;
  const body = await response.json().catch(() => null) as {
    __type?: string; error?: string; message?: string; Message?: string; error_description?: string;
  } | null;
  const code = body?.__type ?? response.headers.get("x-amzn-errortype");
  if (body?.error === "invalid_grant" ||
      (typeof code === "string" && code.split(":")[0].split("#").at(-1) === "NotAuthorizedException")) {
    return true;
  }
  const message = body?.message ?? body?.Message ?? body?.error_description;
  return typeof message === "string" &&
    /\b(?:(?:invalid|expired|revoked) refresh token|refresh token (?:is |has (?:been )?)?(?:invalid|expired|revoked))\b/i.test(message);
}

export async function refreshIdToken(settings: CognitoSettings, token: string): Promise<string> {
  const response = await cognitoRequest(settings, "InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: settings.clientId,
    AuthParameters: { REFRESH_TOKEN: token },
  });
  const result = (await response.json()) as { AuthenticationResult?: { IdToken?: string } };
  const idToken = result.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("Cognito did not return an ID token");
  return idToken;
}

export async function revokeRefreshToken(settings: CognitoSettings, token: string): Promise<void> {
  await cognitoRequest(settings, "RevokeToken", { ClientId: settings.clientId, Token: token });
}
