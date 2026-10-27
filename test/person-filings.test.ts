import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generalElectionLabel } from "../src/lib/copy";
import { collapseIdenticalFilings } from "../src/lib/data/filings";
import { personFilingNote } from "../src/lib/data/filing-note";
import { linkPersonFilings, type PersonRow } from "../src/lib/data/person-filings";
import type { Filing } from "../src/lib/types";

const senate: PersonRow = {
  candidateId: "S6TX00644",
  displayName: "Gavin Solomon",
  fecCandidateId: "S6TX00644",
  partyCode: "WRI",
  partyLabel: "Write-in",
  raceId: "2026-senate-TX",
  office: "senate",
};

const house: PersonRow = {
  candidateId: "S6TX00693",
  displayName: "Gavin Solomon",
  fecCandidateId: "S6TX00693",
  partyCode: "W",
  partyLabel: "Write-in",
  raceId: "2026-house-TX-03",
  office: "house",
};

test("Solomon stays on both contests and each row lists both FEC ids", () => {
  const linked = linkPersonFilings([senate, house]);
  assert.equal(linked.length, 2);
  assert.deepEqual(
    linked.map((row) => row.candidateId),
    ["S6TX00644", "S6TX00693"],
  );
  for (const row of linked) {
    assert.equal(row.multiFiling, true);
    assert.equal(row.writeIn, true);
    assert.deepEqual(
      [...row.filings.map((filing) => filing.fecId)].sort(),
      ["S6TX00644", "S6TX00693"],
    );
    assert.equal(row.filings.find((filing) => filing.office === "senate")?.district, null);
    const note = personFilingNote(row.filings) ?? "";
    assert.match(note, /Same person, including a write-in/);
    assert.match(note, /Senate/);
    assert.match(note, /House district 3/);
    assert.match(note, /S6TX00644/);
    assert.match(note, /S6TX00693/);
  }
  assert.equal(personFilingNote(linked[0]?.filings.slice(0, 1) ?? []), null);
});

test("identical Form 2 rows collapse and a different document stays", () => {
  const first = filing("1", "IMG-1");
  const sameImage = { ...filing("2", "IMG-1"), fecFilingId: "FEC-2" };
  const other = filing("3", "IMG-9");
  const kept = collapseIdenticalFilings([first, sameImage, other]);
  assert.equal(kept.filter((row) => row.imageNumber === "IMG-1").length, 1);
  assert.equal(kept.some((row) => row.imageNumber === "IMG-9"), true);
});

test("federal general election day and year menu stay in sync with the contract", () => {
  assert.equal(generalElectionLabel(2024), "November 5, 2024");
  assert.equal(generalElectionLabel(2026), "November 3, 2026");
  assert.equal(generalElectionLabel(2028), "November 7, 2028");

  const yearSelect = readFileSync(new URL("../src/components/YearSelect.tsx", import.meta.url), "utf8");
  assert.equal(yearSelect.includes("setShown"), false);
  assert.equal(/onPointerDown=\{/.test(yearSelect), false);
  const landing = readFileSync(new URL("../src/components/Landing.tsx", import.meta.url), "utf8");
  assert.match(landing, /data-testid="year-loading"/);
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.cd-map \.cd-district\.has-data:hover[\s\S]*?fill:\s*var\(--color-map-hover\)/);
  assert.match(css, /\.cd-map \.cd-district:hover,\s*\.cd-map \.cd-district:focus-visible\s*\{[^}]*fill:\s*var\(--color-map\)/);
});

function filing(filingId: string, imageNumber: string): Filing {
  return {
    filingId,
    candidateId: "S6TX00644",
    raceId: "2026-senate-TX",
    formType: "F2",
    fecFilingId: "FEC-1",
    imageNumber,
    filedAt: "2026-01-01T00:00:00.000Z",
    fecLoadTimestamp: "2026-01-02T00:00:00.000Z",
    sourceUrl: "https://www.fec.gov/data/filings/?file_number=1",
    retrievedAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
  };
}
