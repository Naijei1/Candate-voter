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
  const zoomed = clampPan({ x: 0, y: 0, scale: 9 }, 300, 200);
  assert.equal(zoomed.scale, 4);
});

test("pulling the sheet below a peek dismisses, otherwise it snaps", () => {
  const snaps = { peek: 100, half: 280, full: 520 };
  assert.deepEqual(sheetSnap(40, snaps, true), { height: 100, dismiss: true });
  assert.deepEqual(sheetSnap(40, snaps, false), { height: 100, dismiss: false });
  assert.deepEqual(sheetSnap(200, snaps, true), { height: 280, dismiss: false });
  assert.deepEqual(sheetSnap(450, snaps, true), { height: 520, dismiss: false });
});

test("phone maps and the state sheet expose pan and drag targets", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const national = readFileSync(new URL("../src/components/UsMap.tsx", import.meta.url), "utf8");
  const district = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.match(national, /<MapGesture/);
  assert.match(district, /<MapGesture/);
  assert.match(css, /\.map-gesture\s*\{[^}]*touch-action:\s*none/);
  assert.match(landing, /className="sheet-grab"/);
  assert.match(landing, /useMobileSheet\(onBack, postal\)/);
  assert.match(css, /--sheet-height,\s*var\(--state-sheet-max\)/);
  assert.match(css, /\.ask-sheet\s*\{[^}]*top:\s*var\(--chrome-block\)/);
  assert.match(css, /env\(safe-area-inset-top/);
});
