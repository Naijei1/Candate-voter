import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_TABLE_NAME,
  createDynamoRepository,
  tableNameFromEnv,
} from "../src/lib/data/repository";

test("table name defaults to candate-voter when unset or blank", () => {
  assert.equal(DEFAULT_TABLE_NAME, "candate-voter");
  assert.equal(tableNameFromEnv({}), "candate-voter");
  assert.equal(tableNameFromEnv({ CANDATE_TABLE_NAME: undefined }), "candate-voter");
  assert.equal(tableNameFromEnv({ CANDATE_TABLE_NAME: "   " }), "candate-voter");
});

test("an explicit table name is trimmed and used as-is", () => {
  assert.equal(
    tableNameFromEnv({ CANDATE_TABLE_NAME: "  other-table  " }),
    "other-table",
  );
});

test("repository creation does not require CANDATE_TABLE_NAME", () => {
  const previous = process.env.CANDATE_TABLE_NAME;
  delete process.env.CANDATE_TABLE_NAME;
  try {
    const repo = createDynamoRepository();
    assert.equal(typeof repo.getRace, "function");
    assert.equal(tableNameFromEnv(), "candate-voter");
  } finally {
    if (previous === undefined) delete process.env.CANDATE_TABLE_NAME;
    else process.env.CANDATE_TABLE_NAME = previous;
  }
});

test("Amplify build writes server env once and does not copy the FEC key", () => {
  const spec = readFileSync("amplify.yml", "utf8");
  assert.match(spec, /rm -f \.env\.production/);
  assert.match(spec, /node scripts\/write-amplify-server-env\.mjs/);
  assert.equal(spec.includes("grep"), false);
  const script = readFileSync("scripts/write-amplify-server-env.mjs", "utf8");
  for (const key of [
    "CANDATE_TABLE_NAME",
    "CANDATE_API_KEY",
    "CANDATE_CYCLES",
    "AWS_REGION",
    "NEXT_PUBLIC_",
  ]) {
    assert.equal(script.includes(key), true, key);
  }
  const allowlistStart = script.indexOf("AMPLIFY_SERVER_ENV_KEYS = Object.freeze([");
  const allowlist = script.slice(allowlistStart, script.indexOf("]);", allowlistStart));
  assert.equal(allowlist.includes("FEC_API_KEY"), false);
});
