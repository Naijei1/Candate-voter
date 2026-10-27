import assert from "node:assert/strict";
import test from "node:test";
import { buildRaceId, mapForm2Filing } from "../src/lib/fec/map-form2";
import type { FecForm2Filing } from "../src/lib/fec/types";

const retrievedAt = "2026-10-26T05:00:00.000Z";

const president: FecForm2Filing = {
  address_city: "Seattle",
  address_state: "WA",
  address_str1: "77 S Washington St",
  address_zip: "98104",
  candidate_district: "0",
  candidate_first_name: "Lois",
  candidate_id: "P80011018",
  candidate_last_name: "Allen",
  candidate_middle_name: "Willow",
  candidate_name: "Allen, Lois Willow",
  candidate_office: "P",
  candidate_party: "REP",
  committee_name: "Lois Uitdeflesch",
  election_state: null,
  election_year: "2027",
  file_number: 2041802,
  image_number: "202610259945202498",
  load_timestamp: "2026-10-25 18:29:15",
  pdf_url:
    "https://docquery.fec.gov/pdf/498/202610259945202498/202610259945202498.pdf",
} as FecForm2Filing;

test("maps a presidential Form 2 without storing the street address", () => {
  const mapped = mapForm2Filing(president, { retrievedAt });
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;

  assert.equal(mapped.race.raceId, "2027-president");
  assert.equal(mapped.race.office, "president");
  assert.equal(mapped.race.state, null);
  assert.equal(mapped.race.district, null);
  assert.equal(mapped.race.cycle, 2027);
  assert.equal(mapped.race.title, "President");
  assert.equal(mapped.race.sourceUrl, "https://www.fec.gov/data/candidates/?election_year=2027&office=P");
  assert.equal(mapped.candidate.candidateId, "P80011018");
  assert.equal(mapped.candidate.fecCandidateId, "P80011018");
  assert.equal(mapped.candidate.displayName, "Lois Willow Allen");
  assert.equal(mapped.candidate.nameAsFiled, "Allen, Lois Willow");
  assert.equal(mapped.candidate.partyAffiliation, "REP");
  assert.equal(mapped.candidate.sourceLoadedAt, "2026-10-25 18:29:15");
  assert.equal(
    mapped.candidate.sourceUrl,
    "https://www.fec.gov/data/candidate/P80011018/",
  );
  assert.equal(mapped.filing.formType, "F2");
  assert.equal(mapped.filing.filingId, "2041802");
  assert.equal(mapped.filing.filedAt, null);
  assert.equal(mapped.filing.fecLoadTimestamp, "2026-10-25 18:29:15");
  assert.equal(mapped.filing.retrievedAt, retrievedAt);
  assert.equal(mapped.filing.updatedAt, retrievedAt);
  assert.match(mapped.filing.sourceUrl ?? "", /^https:\/\/docquery\.fec\.gov\//);

  const serialized = JSON.stringify(mapped);
  assert.equal(serialized.includes("Washington St"), false);
  assert.equal(serialized.includes("98104"), false);
  assert.equal(serialized.includes("endorsement"), false);
  assert.equal(serialized.includes("score"), false);
});

test("maps a House filing onto a zero-padded district race", () => {
  const mapped = mapForm2Filing(
    {
      candidate_id: "H4CA12019",
      candidate_name: "DOE, JANE",
      candidate_office: "h",
      candidate_party: "dem",
      candidate_district: "7",
      election_state: "ca",
      election_year: 2026,
      file_number: "99",
      load_timestamp: "2026-01-02T03:04:05.123Z",
      image_number: "202601020000000001",
      pdf_url: "http://evil.example/not-fec.pdf",
    },
    { retrievedAt },
  );
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.race.raceId, "2026-house-CA-07");
  assert.equal(mapped.race.district, "07");
  assert.equal(mapped.race.title, "U.S. House, California District 7");
  assert.equal(mapped.candidate.displayName, "Jane Doe");
  assert.equal(mapped.candidate.nameAsFiled, "Doe, Jane");
  assert.equal(mapped.candidate.partyAffiliation, "DEM");
  assert.equal(mapped.loadTimestamp, "2026-01-02 03:04:05");
  assert.equal(
    mapped.filing.sourceUrl,
    "https://docquery.fec.gov/cgi-bin/fecimg/?202601020000000001",
  );
  assert.match(mapped.race.sourceUrl ?? "", /office=H/);
  assert.match(mapped.race.sourceUrl ?? "", /district=07/);
});

test("maps Senate and at-large House contests", () => {
  const senate = mapForm2Filing(
    {
      candidate_id: "S6AK00111",
      candidate_last_name: "Ng",
      candidate_first_name: "Ada",
      candidate_office: "S",
      election_state: "AK",
      election_year: "2026",
      file_number: 10,
      load_timestamp: "2026-03-01 00:00:00",
      candidate_district: "00",
    },
    { retrievedAt },
  );
  assert.equal(senate.ok, true);
  if (!senate.ok) return;
  assert.equal(senate.race.raceId, "2026-senate-AK");
  assert.equal(senate.race.district, null);
  assert.equal(senate.race.title, "U.S. Senate, Alaska");

  const atLarge = mapForm2Filing(
    {
      candidate_id: "H6AK00001",
      candidate_last_name: "Ng",
      candidate_first_name: "Ada",
      candidate_office: "H",
      election_state: "AK",
      election_year: "2026",
      file_number: 11,
      load_timestamp: "2026-03-01 00:00:00",
      candidate_district: "0",
    },
    { retrievedAt },
  );
  assert.equal(atLarge.ok, true);
  if (!atLarge.ok) return;
  assert.equal(atLarge.race.raceId, "2026-house-AK-00");
  assert.equal(atLarge.race.title, "U.S. House, Alaska at-large");
});

test("Wyoming House district 1 is the at-large race", () => {
  const mapped = mapForm2Filing(
    {
      candidate_id: "H6WY01181",
      candidate_first_name: "RICHARD",
      candidate_last_name: "DODSON",
      candidate_middle_name: "L",
      candidate_office: "H",
      candidate_party: "W",
      candidate_district: "1",
      election_state: "WY",
      election_year: 2026,
      file_number: 42,
      load_timestamp: "2026-03-01 00:00:00",
    },
    { retrievedAt },
  );
  assert.equal(mapped.ok, true);
  if (!mapped.ok) return;
  assert.equal(mapped.race.raceId, "2026-house-WY-00");
  assert.equal(mapped.race.district, "00");
  assert.equal(mapped.race.title, "U.S. House, Wyoming at-large");
  assert.equal(mapped.race.jurisdiction, "Wyoming at-large");
  assert.equal(mapped.candidate.displayName, "Richard L Dodson");
  assert.equal(mapped.candidate.partyAffiliation, "W");
  assert.match(mapped.race.sourceUrl ?? "", /district=00/);
});

test("Texas district 00 is not an at-large House race", () => {
  const bogus = mapForm2Filing(
    {
      candidate_id: "H6TX00001",
      candidate_last_name: "Ng",
      candidate_first_name: "Ada",
      candidate_office: "H",
      election_state: "TX",
      election_year: "2026",
      file_number: 12,
      load_timestamp: "2026-03-01 00:00:00",
      candidate_district: "00",
    },
    { retrievedAt },
  );
  assert.deepEqual(bogus, { ok: false, reason: "invalid-district" });

  const real = mapForm2Filing(
    {
      candidate_id: "H6TX07001",
      candidate_last_name: "Ng",
      candidate_first_name: "Ada",
      candidate_office: "H",
      election_state: "TX",
      election_year: "2026",
      file_number: 13,
      load_timestamp: "2026-03-01 00:00:00",
      candidate_district: "7",
    },
    { retrievedAt },
  );
  assert.equal(real.ok, true);
  if (!real.ok) return;
  assert.equal(real.race.raceId, "2026-house-TX-07");
});

test("drops a filing whose only name is n/a and strips the token from a real name", () => {
  const placeholder = mapForm2Filing(
    {
      candidate_id: "P80000001",
      candidate_first_name: "N/A",
      candidate_last_name: "n/a",
      candidate_name: "N/A",
      candidate_office: "P",
      election_year: 2028,
      file_number: 7,
      load_timestamp: "2026-03-01 00:00:00",
    },
    { retrievedAt },
  );
  assert.deepEqual(placeholder, { ok: false, reason: "placeholder-name" });

  const named = mapForm2Filing(
    {
      candidate_id: "P60024668",
      candidate_first_name: "James",
      candidate_middle_name: "n/a",
      candidate_last_name: "Athans",
      candidate_name: "Athans, James n/a",
      candidate_office: "P",
      election_year: 2026,
      file_number: 8,
      load_timestamp: "2026-03-01 00:00:00",
    },
    { retrievedAt },
  );
  assert.equal(named.ok, true);
  if (!named.ok) return;
  assert.equal(named.candidate.displayName, "James Athans");
  assert.equal(named.candidate.nameAsFiled, "Athans, James");
});

test("skips filings that cannot form a stable race", () => {
  assert.deepEqual(
    mapForm2Filing({ file_number: 1, load_timestamp: "2026-01-01 00:00:00" }, { retrievedAt }),
    { ok: false, reason: "unsupported-office" },
  );
  assert.deepEqual(
    mapForm2Filing(
      {
        file_number: 1,
        load_timestamp: "2026-01-01 00:00:00",
        candidate_office: "H",
        election_year: "2026",
      },
      { retrievedAt },
    ),
    { ok: false, reason: "missing-state" },
  );
  assert.equal(buildRaceId({ office: "president", cycle: 2028, state: "US", district: "00" }), "2028-president");
});
