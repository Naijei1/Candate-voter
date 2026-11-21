import type { CognitoSettings } from "./cognito-settings";

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
  if (!response.ok) throw new Error(`Cognito ${action} failed (${response.status})`);
  return response;
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
