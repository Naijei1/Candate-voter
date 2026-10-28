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

test("phone maps and the state sheet expose pan and drag targets", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const national = readFileSync(new URL("../src/components/UsMap.tsx", import.meta.url), "utf8");
  const district = readFileSync(new URL("../src/components/DistrictMap.tsx", import.meta.url), "utf8");
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.match(national, /<MapGesture/);
  assert.match(district, /<MapGesture/);
  assert.match(css, /\.map-gesture\s*\{[^}]*touch-action:\s*none/);
  assert.match(landing, /className="sheet-grab"/);
  assert.match(landing, /useMobileSheet\(onSheetDismiss, postal\)/);
  assert.match(landing, /onSheetDismiss=\{pinYours \? null : backToMap\}/);
  assert.match(landing, /onBack=\{backToMap\}/);
  assert.match(css, /--sheet-height,\s*var\(--state-sheet-max\)/);
  assert.match(css, /\.ask-sheet\s*\{[^}]*top:\s*var\(--chrome-block\)/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(national, /onPanActive/);
  assert.match(national, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(css, /\.national-shell \.map-bleed\s*\{[^}]*top:\s*var\(--map-clearance\)/);
  const mobile = css.slice(css.indexOf("@media (max-width: 1023px)"), css.indexOf("@media (max-width: 420px)"));
  assert.match(mobile, /\.us-map \.us-label-callout[\s\S]*?font-size:\s*36px/);
  assert.match(mobile, /\.national-shell\s*\{[^}]*display:\s*flex/);
  assert.match(mobile, /\.national-shell\s*\{[^}]*flex-direction:\s*column/);
  assert.match(mobile, /\.national-shell \.map-stage\s*\{[^}]*flex:\s*1 1 auto/);
  assert.match(mobile, /\.national-shell \.map-stage\s*\{[^}]*min-height:\s*0/);
  assert.match(mobile, /\.national-shell \.map-stage \.us-map\s*\{[^}]*width:\s*100%/);
  assert.match(mobile, /\.national-shell \.map-stage \.us-map\s*\{[^}]*height:\s*100%/);
  assert.match(mobile, /\.national-shell \.map-stage \.us-map\s*\{[^}]*max-width:\s*100%/);
  assert.doesNotMatch(mobile, /\.national-shell \.map-stage \.us-map\s*\{[^}]*min-width:\s*100%/);
  assert.doesNotMatch(mobile, /\.national-shell \.map-stage \.us-map\s*\{[^}]*translateX\(-50%\)/);
  assert.match(landing, /zipFailureClearsSelection/);
  assert.match(landing, /heldZip\.current = null/);
  assert.match(landing, /onReject=\{rejectZip\}/);
  assert.match(landing, /onLookupStart=\{beginZipLookup\}/);
  assert.match(landing, /fieldKey=\{selected \?\? "national"\}/);
  assert.match(landing, /yearLock\.current != null/);
});
