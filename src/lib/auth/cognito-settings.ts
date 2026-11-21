export type CognitoSettings = {
  userPoolId: string;
  clientId: string;
  region: string;
};

export function cognitoSettings(
  env: Record<string, string | undefined> = process.env,
): CognitoSettings | null {
  const userPoolId = env.COGNITO_USER_POOL_ID?.trim() ?? "";
  const clientId = env.COGNITO_CLIENT_ID?.trim() ?? "";
  const region = env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || "us-east-1";
  if (!userPoolId || !clientId) return null;
  return { userPoolId, clientId, region };
}
