import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clampPan, nextPan, sheetSnap } from "../src/lib/map/gesture";

test("a finger drag pans the map and a pinch scales it", () => {
  const dragged = nextPan({ x: 0, y: 0, scale: 1 }, { x: 10, y: 20 }, 0, [{ x: 40, y: 50 }]);
  assert.deepEqual(dragged, { x: 30, y: 30, scale: 1 });
  const clamped = clampPan(dragged, 200, 100);
  assert.equal(clamped.x <= 200 * 0.46, true);
  assert.equal(clamped.scale, 1);

  const pinched = nextPan({ x: 0, y: 0, scale: 1 }, { x: 0, y: 0 }, 100, [
    { x: -100, y: 0 },
    { x: 100, y: 0 },
  ]);
  assert.equal(pinched.scale, 2);
  const aroundFingers = nextPan(
    { x: 0, y: 0, scale: 1 },
    { x: 300, y: 200 },
    100,
    [
      { x: 200, y: 200 },
      { x: 400, y: 200 },
    ],
    { x: 200, y: 200 },
  );
  assert.equal(aroundFingers.scale, 2);
  assert.equal(aroundFingers.x, -100);
  assert.equal(aroundFingers.y, 0);
  const zoomed = clampPan({ x: 0, y: 0, scale: 9 }, 300, 200);
  assert.equal(zoomed.scale, 4);
  const fitted = clampPan({ x: 0, y: 0, scale: 0.2 }, 300, 200);
  assert.equal(fitted.scale, 1);

  const covered = clampPan({ x: -4000, y: 0, scale: 1 }, 390, 640, {
    contentWidth: 1216,
    contentHeight: 640,
    minScale: 390 / 1216,
  });
  assert.equal(covered.x, -((1216 - 390) / 2));
  const wholeMap = clampPan({ x: 0, y: 0, scale: 0.05 }, 390, 640, {
    contentWidth: 1216,
    contentHeight: 640,
    minScale: 390 / 1216,
  });
  assert.equal(wholeMap.scale, 390 / 1216);
});

test("pulling the sheet below a peek dismisses, otherwise it snaps", () => {
  const snaps = { peek: 100, half: 280, full: 520 };
  assert.deepEqual(sheetSnap(40, snaps, true), { height: 100, dismiss: true });
  assert.deepEqual(sheetSnap(40, snaps, false), { height: 100, dismiss: false });
  assert.deepEqual(sheetSnap(200, snaps, true), { height: 280, dismiss: false });
  assert.deepEqual(sheetSnap(450, snaps, true), { height: 520, dismiss: false });
});

test("explore and district maps still use the pan gesture", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const national = readFileSync(new URL("../src/components/UsMap.tsx", import.meta.url), "utf8");
  const district = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  const explore = readFileSync(new URL("../src/app/states/page.tsx", import.meta.url), "utf8");
  const note = readFileSync(new URL("../src/components/site/DistrictVintageNote.tsx", import.meta.url), "utf8");
  assert.match(national, /<MapGesture/);
  assert.match(district, /<MapGesture/);
  assert.match(css, /\.map-gesture\s*\{[^}]*touch-action:\s*none/);
  assert.match(national, /onPanActive/);
  assert.match(national, /preserveAspectRatio="xMidYMin meet"/);
  assert.match(explore, /StateExplore/);
  assert.match(explore, /DistrictVintageNote/);
  assert.match(note, /CD119_CONGRESS/);
  assert.match(note, /120th/);
});
