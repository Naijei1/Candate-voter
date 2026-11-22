import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { GET as getFollows } from "../src/app/api/v1/me/follows/route";
import { GET as getPreferences, PUT as putPreferences } from "../src/app/api/v1/me/preferences/route";
import { meUser } from "../src/lib/api/me-auth";
import { followReturnPath } from "../src/lib/auth/return-path";

const origin = "https://voter.example";
const pool = "us-east-1_PlatformTest";
const clientId = "platform-test";
const sub = "account-uuid";

function request(path: string, params?: RequestInit) {
  return new Request(`${origin}/api/v1/me/${path}`, params);
}

test("me routes verify Cognito ID and access JWTs for the configured app client and isolate account reads", async (t) => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const encode = (claims: object) => Buffer.from(JSON.stringify(claims)).toString("base64url");
  function jwt(claims: object) {
    const data = `${encode({ alg: "RS256", kid: "test" })}.${encode({ iss: `https://cognito-idp.us-east-1.amazonaws.com/${pool}`, sub, exp: Math.floor(Date.now() / 1000) + 60, ...claims })}`;
    return `${data}.${sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url")}`;
  }
  const previous = { COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID };
  process.env.COGNITO_USER_POOL_ID = pool;
  process.env.COGNITO_CLIENT_ID = clientId;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const create = CognitoJwtVerifier.create.bind(CognitoJwtVerifier);
  t.mock.method(CognitoJwtVerifier, "create", (settings: Parameters<typeof create>[0]) => {
    assert.deepEqual(settings, { userPoolId: pool, clientId, tokenUse: null });
    const verifier = create(settings);
    verifier.cacheJwks({ keys: [{ ...publicKey.export({ format: "jwk" }), kty: "RSA", kid: "test", alg: "RS256", use: "sig" }] }, pool);
    return verifier;
  });
  let reads = 0;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command: { input: { Key?: { pk?: string }; ExpressionAttributeValues?: Record<string, unknown> } }) => {
    reads += 1;
    assert.equal(command.input.Key?.pk ?? command.input.ExpressionAttributeValues?.[":pk"], `USER#${sub}`);
    return {};
  });
  const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
  const id = jwt({ token_use: "id", aud: clientId });
  const access = jwt({ token_use: "access", client_id: clientId });
  assert.deepEqual(await (await getFollows(request("follows", auth(access)))).json(), { version: 1, follows: [] });
  assert.deepEqual(await (await getPreferences(request("preferences", auth(id)))).json(), { version: 1, preferences: { geography: null, issues: null } });
  assert.equal((await getFollows(request("follows", auth(jwt({ token_use: "access", client_id: "another-client" }))))).status, 401);
  assert.equal((await getPreferences(request("preferences", auth(jwt({ token_use: "id", aud: clientId, exp: 1 }))))).status, 401);
  assert.equal((await putPreferences(request("preferences", { ...auth("invalid"), method: "PUT" }))).status, 401);
  assert.equal(reads, 2);
});

test("me auth uses the existing verified web session and requires same-origin cookie writes", async () => {
  const user = { sub, email: "person@example.test", emailVerified: true, groups: [] };
  const cookie = async () => user;
  assert.equal(await meUser(request("preferences"), cookie), user);
  assert.equal(await meUser(request("preferences", { method: "PUT", headers: { origin } }), cookie), user);
  assert.equal(await meUser(request("preferences", { method: "PUT", headers: { origin: "https://other.example" } }), cookie), null);
  assert.equal(await meUser(request("preferences"), async () => null), null);
  assert.equal(await meUser(request("preferences", { headers: { authorization: "Bearer invalid" } }), cookie, async () => null), null);
  assert.equal(followReturnPath("/races/2026-senate-KY"), "/races/2026-senate-KY");
  assert.equal(followReturnPath("//other.example"), null);
  assert.equal(followReturnPath("/candidates/%2e%2e%2faccount"), null);
});
