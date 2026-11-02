import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAdminEmail } from "../src/lib/auth/admin";
import { passwordError } from "../src/lib/auth/cognito";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import {
  ALERT_DELIVERY_STATUS,
  alertDedupeKey,
  dedupeNotices,
  followSortKey,
  parseQuietHours,
  userPartition,
  type AlertNotice,
} from "../src/lib/users/alerts";

test("alert dedupe uses the event time and ignores when it was detected", () => {
  const key = alertDedupeKey({
    category: "filings",
    targetType: "race",
    targetId: "2026-senate-KY",
    eventAt: "2026-10-01T00:00:00.000Z",
  });
  assert.equal(key, "filings#race#2026-senate-KY#2026-10-01T00:00:00.000Z");
  const first: AlertNotice = {
    userId: "user-1",
    category: "filings",
    targetType: "race",
    targetId: "2026-senate-KY",
    eventAt: "2026-10-01T00:00:00.000Z",
    detectedAt: "2026-10-02T00:00:00.000Z",
    dedupeKey: key,
  };
  const again: AlertNotice = { ...first, detectedAt: "2026-10-03T12:00:00.000Z" };
  assert.equal(dedupeNotices([first, again]).length, 1);
  assert.equal(dedupeNotices([first, { ...again, eventAt: "2026-10-04T00:00:00.000Z", dedupeKey: "other" }]).length, 2);
});

test("follow keys and quiet hours stay explicit", () => {
  assert.equal(userPartition("abc"), "USER#abc");
  assert.equal(followSortKey("jurisdiction", "KY"), "FOLLOW#jurisdiction#KY");
  assert.equal(ALERT_DELIVERY_STATUS, "planned");
  assert.deepEqual(parseQuietHours(null, null), { ok: true, value: null });
  assert.deepEqual(parseQuietHours("22:00", "07:00"), { ok: true, value: { start: "22:00", end: "07:00" } });
  assert.deepEqual(parseQuietHours("22:00", null), { ok: false });
  assert.equal(passwordError("short"), "Use at least 12 characters.");
  assert.equal(passwordError("longenoughpassword"), "Use upper case, lower case, and a number.");
  assert.equal(passwordError("Longenough12"), null);
});

test("admin review is an email allowlist", () => {
  const env = { ADMIN_EMAILS: " Owner@Example.com, not-an-email, second@example.com " };
  assert.equal(isAdminEmail("owner@example.com", env), true);
  assert.equal(isAdminEmail("second@example.com", env), true);
  assert.equal(isAdminEmail("other@example.com", env), false);
  assert.equal(isAdminEmail(null, env), false);
});

test("correction reports list newest first", async () => {
  const repo = new MemoryVoterRepository();
  await repo.saveCorrection({
    correctionId: "old",
    raceId: "2026-senate-KY",
    candidateId: null,
    note: "Earlier",
    createdAt: "2026-10-01T00:00:00.000Z",
  });
  await repo.saveCorrection({
    correctionId: "new",
    raceId: null,
    candidateId: "S2KY00012",
    note: "Later",
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
  assert.match(template, /ManagedPolicyName: candate-voter-amplify-compute/);
  assert.match(template, /dynamodb:LeadingKeys:/);
  assert.match(template, /CORRECTION#\*/);
  assert.match(template, /- CORRECTIONS/);
  assert.match(template, /dynamodb:PutItem/);
  assert.match(template, /dynamodb:UpdateItem/);
  assert.equal(template.includes("Google"), false);
  assert.equal(template.includes("AWS::SES"), false);
  const script = readFileSync("scripts/write-amplify-server-env.mjs", "utf8");
  for (const key of ["CANDATE_USERS_TABLE", "COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID", "ADMIN_EMAILS"]) {
    assert.equal(script.includes(key), true, key);
  }
  const store = readFileSync("src/lib/users/store.ts", "utf8");
  assert.match(store, /deliveryStatus: ALERT_DELIVERY_STATUS/);
  const admin = readFileSync("src/app/admin/corrections/page.tsx", "utf8");
  const guard = readFileSync("src/lib/auth/guard.ts", "utf8");
  assert.match(admin, /adminActor/);
  assert.match(guard, /isAdminEmail/);
});
