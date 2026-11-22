import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { isAdmin } from "../src/lib/auth/admin";
import { passwordError } from "../src/lib/auth/cognito";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { followSortKey, userPartition } from "../src/lib/users/follows";

test("follow keys and password validation stay explicit", () => {
  assert.equal(userPartition("abc"), "USER#abc");
  assert.equal(followSortKey("jurisdiction", "KY"), "FOLLOW#jurisdiction#KY");
  assert.equal(passwordError("short"), "Use at least 12 characters.");
  assert.equal(passwordError("longenoughpassword"), "Use upper case, lower case, and a number.");
  assert.equal(passwordError("Longenough12"), null);
});

test("watchlist can remove follows and separately update email alerts", () => {
  const panel = readFileSync("src/components/site/AccountPanel.tsx", "utf8");
  assert.match(panel, /fetch\(withBasePath\("\/api\/v1\/me\/follows"\)/);
  assert.match(panel, /fetch\(withBasePath\("\/api\/alerts\/email"\)/);
  assert.equal(existsSync("src/app/api/alerts/route.ts"), false);
});

test("follow controls receive server sign-in state and guard signed-out requests", () => {
  const follow = readFileSync("src/components/site/FollowControl.tsx", "utf8");
  assert.match(follow, /if \(!signedIn\) return;[\s\S]*?fetch\(endpoint\)/);
  assert.match(follow, /if \(!signedIn \|\| expired\) return <Link[^>]*href=\{signIn\}/);
  for (const page of ["states/ky", "races/[raceId]", "candidates/[candidateId]"]) {
    assert.match(readFileSync(`src/app/${page}/page.tsx`, "utf8"), /<FollowControl signedIn=\{Boolean\(await currentUser\(\)\)\}/);
  }
});

test("admin review requires the exact Cognito admin group", () => {
  const matchingEmail = { email: "owner@example.com" };
  assert.equal(isAdmin({ groups: ["admin", "us-east-1_xxx_Google"] }), true);
  assert.equal(isAdmin({ groups: ["us-east-1_xxx_Google", "Admin"] }), false);
  assert.equal(isAdmin({ ...matchingEmail, groups: [] }), false);
  assert.equal(isAdmin(matchingEmail as { email: string; groups?: string[] }), false);
});

test("correction reports list newest first", async () => {
  const repo = new MemoryVoterRepository();
  await repo.saveCorrection({
    correctionId: "old",
    raceId: "2026-senate-KY",
    candidateId: null,
    note: "Earlier",
    status: "new",
    statusLog: [],
    createdAt: "2026-10-01T00:00:00.000Z",
  });
  await repo.saveCorrection({
    correctionId: "new",
    raceId: null,
    candidateId: "S2KY00012",
    note: "Later",
    status: "new",
    statusLog: [],
    createdAt: "2026-10-02T00:00:00.000Z",
  });
  const listed = await repo.listCorrections(1);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.correctionId, "new");
});

test("account infrastructure stays least privilege and separate from filings", () => {
  const template = readFileSync("infra/template.yaml", "utf8");
  const ingest = template.slice(0, template.indexOf("UsersTable:"));
  assert.equal(ingest.includes("dynamodb:DeleteItem"), false);
  assert.match(template, /TableName: !Ref UsersTableName/);
  assert.match(template, /Default: candate-voter-users/);
  assert.match(template, /AWS::Cognito::UserPool/);
  assert.match(template, /UsernameAttributes:\s*\n\s*- email/);
  assert.match(template, /ALLOW_USER_PASSWORD_AUTH/);
  assert.match(template, /GenerateSecret: false/);
  assert.match(template, /AmplifyComputePolicy:/);
  assert.equal(template.includes("ManagedPolicyName:"), false);
  assert.match(template, /dynamodb:LeadingKeys:/);
  assert.match(template, /CORRECTION#\*/);
  assert.match(template, /- CORRECTIONS/);
  assert.match(template, /dynamodb:PutItem/);
  assert.match(template, /dynamodb:UpdateItem/);
  assert.match(template, /GoogleClientId:/);
  assert.match(template, /Condition: HasGoogle/);
  assert.match(template, /AttributeMapping:\s*\n\s*email: email\s*\n\s*email_verified: email_verified/);
  assert.match(template, /Default: ""/);
  assert.match(template, /!Ref GoogleProvider/);
  assert.equal(template.includes("DependsOn: !If"), false);
  assert.equal(template.includes("AWS::SES"), false);
  const script = readFileSync("scripts/write-amplify-server-env.mjs", "utf8");
  for (const key of ["CANDATE_USERS_TABLE", "COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID", "COGNITO_DOMAIN", "COGNITO_GOOGLE", "CANDATE_AI_DAILY_CAP"]) {
    assert.equal(script.includes(key), true, key);
  }
  const googleRoute = readFileSync("src/app/sign-in/google/route.ts", "utf8");
  assert.match(googleRoute, /originFromRequest/);
  assert.equal(googleRoute.includes("url.origin"), false);
  const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
  const terms = readFileSync("src/app/terms/page.tsx", "utf8");
  const footer = readFileSync("src/components/SiteFooter.tsx", "utf8");
  assert.match(privacy, /never sell/);
  assert.match(terms, /privacy policy/);
  assert.match(footer, /href: "\/privacy"/);
  assert.match(footer, /href: "\/terms"/);
  const admin = readFileSync("src/app/admin/corrections/page.tsx", "utf8");
  const guard = readFileSync("src/lib/auth/guard.ts", "utf8");
  assert.match(admin, /adminActor/);
  assert.match(guard, /isAdmin/);
});
