import assert from "node:assert/strict";
import test from "node:test";
import { nextWatermark } from "../src/lib/ingest/watermark";

test("a short page advances through the latest timestamp", () => {
  assert.equal(
    nextWatermark({
      current: "2026-01-01 00:00:00",
      timestamps: ["2026-01-01 00:00:00", "2026-01-02 00:00:00"],
      pageIsFull: false,
    }),
    "2026-01-02 00:00:00",
  );
});

test("a full page does not consume a timestamp that may continue", () => {
  assert.equal(
    nextWatermark({
      current: null,
      timestamps: [
        "2026-01-01 00:00:01",
        "2026-01-01 00:00:02",
        "2026-01-01 00:00:02",
      ],
      pageIsFull: true,
    }),
    "2026-01-01 00:00:01",
  );
});

test("a full page of one timestamp does not move the cursor", () => {
  assert.equal(
    nextWatermark({
      current: "2026-01-01 00:00:00",
      timestamps: ["2026-01-01 00:00:00", "2026-01-01 00:00:00"],
      pageIsFull: true,
    }),
    "2026-01-01 00:00:00",
  );
});
