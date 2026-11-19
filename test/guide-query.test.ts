import assert from "node:assert/strict";
import test from "node:test";
import { parseGuideQuery } from "../src/lib/site/guide-query";
import { guideRaces } from "../src/lib/site/guide-races";

const races = guideRaces();
const parse = (query: string) => parseGuideQuery(new URLSearchParams(query), races);

test("a Senate race link opens the race step", () => {
  assert.deepEqual(parse("race=2026-senate-KY"), {
    step: "race", zipParam: "", district: null, raceParam: "2026-senate-KY",
  });
});

for (const district of ["01", "02", "03", "04", "05", "06"]) {
  const raceParam = `2026-house-KY-${district}`;
  test(`a ${raceParam} link opens its race and supplies its district`, () => {
    const expected = { step: "race", zipParam: "", district, raceParam };
    assert.deepEqual(parse(`race=${raceParam}`), expected);
    assert.deepEqual(parse(`race=${raceParam}&district=99`), expected);
  });
}

test("an unknown race opens the first step", () => {
  const expected = { step: "zip", zipParam: "", district: null, raceParam: null };
  assert.deepEqual(parse("race=2026-house-KY-99"), expected);
  assert.deepEqual(parse("race=%ZZ&step=race"), expected);
});

test("explicit step, district, and ZIP still control guide navigation", () => {
  assert.deepEqual(parse("step=races&district=06&zip=40502"), {
    step: "races", zipParam: "40502", district: "06", raceParam: null,
  });
  assert.deepEqual(parse("step=list&district=06&race=2026-senate-KY"), {
    step: "list", zipParam: "", district: "06", raceParam: "2026-senate-KY",
  });
});
