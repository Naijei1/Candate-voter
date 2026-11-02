import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCheckId, parseCheckNote } from "../src/lib/content/checks";
import { AWAITING_CONTENT, emptySiteCopy, publishedCopy, readCopyField } from "../src/lib/content/copy";
import { FEATURE_STATUSES, FEATURES } from "../src/lib/content/features";
import { clampCrop, isBrandKey } from "../src/lib/content/media-rules";
import { MemoryVoterRepository } from "../src/lib/data/memory-repository";

test("empty site copy stays awaiting content", () => {
  const copy = emptySiteCopy();
  assert.equal(publishedCopy(copy.mission), null);
  assert.equal(publishedCopy("  "), null);
  assert.equal(publishedCopy("Approved mission."), "Approved mission.");
  assert.equal(readCopyField("x".repeat(2001)), null);
  assert.equal(AWAITING_CONTENT, "Awaiting content");
});

test("brand uploads stay under the slot prefix and crops stay inside the image", () => {
  assert.equal(isBrandKey("logo", "brand/logo/abc.jpg"), true);
  assert.equal(isBrandKey("logo", "brand/hero/abc.jpg"), false);
  assert.equal(isBrandKey("hero", "brand/hero/../secret.jpg"), false);
  assert.deepEqual(clampCrop({ width: 100, height: 80, x: -5, y: 70, size: 40 }), { x: 0, y: 40, size: 40 });
  assert.equal(parseCheckId("../etc"), null);
  assert.equal(parseCheckId("2026-senate-KY"), "2026-senate-KY");
  assert.equal(parseCheckNote("x".repeat(281)), null);
});

test("correction status moves through the review workflow", async () => {
  const repo = new MemoryVoterRepository();
  await repo.saveCorrection({
    correctionId: "11111111-1111-1111-1111-111111111111",
    raceId: "2026-senate-KY",
    candidateId: null,
    note: "Wrong party label",
    createdAt: "2026-11-02T00:00:00.000Z",
    status: "new",
    statusLog: [],
  });
  const updated = await repo.updateCorrectionStatus(
    "11111111-1111-1111-1111-111111111111",
    "reviewing",
    "owner@example.com",
    "2026-11-02T01:00:00.000Z",
  );
  assert.equal(updated?.status, "reviewing");
  assert.deepEqual(
    updated?.statusLog.map((event) => event.status),
    ["new", "reviewing"],
  );
  const fixed = await repo.updateCorrectionStatus(
    "11111111-1111-1111-1111-111111111111",
    "fixed",
    "owner@example.com",
    "2026-11-02T02:00:00.000Z",
  );
  assert.equal(fixed?.statusLog.at(-1)?.status, "fixed");
});

test("feature registry uses only the four public labels", () => {
  for (const feature of FEATURES) {
    assert.equal(FEATURE_STATUSES.includes(feature.status), true, feature.id);
  }
  assert.equal(new Set(FEATURES.map((feature) => feature.status)).size > 1, true);
});

test("media bucket and content keys are least privilege", () => {
  const template = readFileSync("infra/template.yaml", "utf8");
  assert.match(template, /candate-voter-media-\$\{AWS::AccountId\}/);
  assert.match(template, /\$\{MediaBucket\.Arn\}\/brand\/\*/);
  assert.match(template, /CONTENT#\*/);
  assert.match(template, /CHECK#\*/);
  assert.match(template, /Description: >-/);
  assert.equal(template.includes("s3:*"), false);
  const script = readFileSync("scripts/write-amplify-server-env.mjs", "utf8");
  assert.match(script, /CANDATE_MEDIA_BUCKET/);
});
