import assert from "node:assert/strict";
import test from "node:test";
import { fromCandidateItem, toCandidateItem } from "../src/lib/data/items";
import { presentCandidate } from "../src/lib/data/view";
import { parseMarkdown } from "../src/lib/chat/ui";
import {
  ALIGNMENT_DISCLAIMER,
  ASK_INTRO,
  applyPagePrefix,
  askScopeForCandidate,
  askScopeForRace,
  askScopeForState,
  askScopeForYear,
  buildChatPayload,
  pageContextFromScope,
  parseChatResponse,
  retryAfterSeconds,
} from "../src/lib/chat/scope";
import type { Candidate, Race } from "../src/lib/types";

function race(partial: Pick<Race, "raceId" | "office" | "title"> & Partial<Race>): Race {
  return {
    cycle: 2026,
    state: null,
    district: null,
    jurisdiction: "United States",
    sourceUrl: "https://www.fec.gov/data/candidates/",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

const races: Race[] = [
  race({ raceId: "2026-president", office: "president", title: "President" }),
  race({
    raceId: "2026-senate-CA",
    office: "senate",
    title: "U.S. Senate, California",
    state: "CA",
    jurisdiction: "California",
  }),
  race({
    raceId: "2026-house-CA-11",
    office: "house",
    title: "U.S. House, California District 11",
    state: "CA",
    district: "11",
  }),
  race({
    raceId: "2026-house-CA-02",
    office: "house",
    title: "U.S. House, California District 2",
    state: "CA",
    district: "02",
  }),
];

test("ask payload carries real ids and cycle, and does not send mode or state", () => {
  const stateBody = buildChatPayload({
    message: "Who has filed?",
    scope: askScopeForState(2026, "CA", races),
  });
  assert.equal(stateBody.cycle, 2026);
  assert.equal(stateBody.raceId, "2026-senate-CA");
  assert.equal(stateBody.candidateId, undefined);
  assert.equal("mode" in stateBody, false);
  assert.equal("state" in stateBody, false);
  assert.match(stateBody.message, /California/);
  assert.match(stateBody.message, /2026-house-CA-02/);
  assert.match(stateBody.message, /Who has filed\?$/);

  const empty = buildChatPayload({
    message: "Anything stored?",
    scope: askScopeForState(2026, "WY", races),
  });
  assert.equal(empty.raceId, undefined);
  assert.equal(empty.cycle, 2026);
  assert.match(empty.message, /none/);

  const year = buildChatPayload({
    message: "What is stored?",
    scope: askScopeForYear(2026),
  });
  assert.deepEqual(year, { message: "What is stored?", cycle: 2026 });

  const contest = race({
    raceId: "2026-senate-VA",
    office: "senate",
    title: "U.S. Senate, Virginia",
    state: "VA",
    cycle: 2026,
  });
  const raceBody = buildChatPayload({
    message: "List candidates",
    scope: askScopeForRace(contest),
    threadId: "thread-1",
  });
  assert.deepEqual(raceBody, {
    message: "List candidates",
    raceId: "2026-senate-VA",
    cycle: 2026,
    threadId: "thread-1",
  });

  const candidateBody = buildChatPayload({
    message: "Show filings",
    scope: askScopeForCandidate({
      candidateId: "S0CA00123",
      raceId: "2026-senate-CA",
      displayName: "Ada Klein",
      cycle: 2026,
    }),
  });
  assert.equal(candidateBody.candidateId, "S0CA00123");
  assert.equal(candidateBody.raceId, "2026-senate-CA");
  assert.equal(candidateBody.message, "Show filings");
});

test("chat responses keep API markdown and only flag alignment mode", () => {
  assert.equal(
    ALIGNMENT_DISCLAIMER,
    "Viewpoint similarity uses public records only. This is not a voting recommendation.",
  );
  assert.equal(ASK_INTRO.includes(ALIGNMENT_DISCLAIMER), false);
  assert.equal(/recommend who to vote/i.test(ASK_INTRO), false);
  const ca = pageContextFromScope(askScopeForState(2026, "CA", races));
  assert.equal(ca.raceId, "2026-senate-CA");
  assert.equal(ca.cycle, 2026);
  assert.match(applyPagePrefix(ca.messagePrefix, "Who filed?"), /2026-senate-CA/);
  assert.equal(applyPagePrefix("ignore this", "Who filed?"), "Who filed?");

  const alignment = parseChatResponse({
    answer_markdown: "Two stored filers discuss housing in their statements.",
    sources: [
      {
        title: "U.S. Senate, California",
        url: "https://www.fec.gov/data/elections/senate/CA/2026/",
        as_of: "2026-10-26T05:00:00.000Z",
      },
    ],
    refused: false,
    mode: "alignment",
    threadId: "thread-9",
    extra: true,
  });
  assert.equal(alignment?.mode, "alignment");
  assert.equal(alignment?.refused, false);
  assert.match(alignment?.answerMarkdown ?? "", /housing/);
  assert.equal(alignment?.sources.length, 1);

  const refused = parseChatResponse({
    answer_markdown: "I can't recommend a candidate.",
    sources: [],
    refused: true,
  });
  assert.equal(refused?.mode, null);
  assert.equal(refused?.refused, true);
  assert.equal(refused?.answerMarkdown, "I can't recommend a candidate.");

  const factual = parseChatResponse({
    answer_markdown: "One Senate race is stored.",
    sources: [],
    refused: false,
    mode: "factual",
  });
  assert.equal(factual?.mode, "factual");
  assert.equal(parseChatResponse({ refused: false }), null);
  assert.equal(retryAfterSeconds("12"), 12);
  assert.equal(retryAfterSeconds("Wed, 21 Oct 2015 07:28:00 GMT"), null);
});

test("answer markdown renders structure without raw heading marks or html", () => {
  const blocks = parseMarkdown(
    "## Senate\n\nOne **stored** race.\n\n- [FEC](https://www.fec.gov/data/)\n- <script>alert(1)</script>\n\n1. First filing\n\n[skip](javascript:alert(1))",
  );
  assert.equal(blocks[0]?.type, "h");
  if (blocks[0]?.type === "h") {
    assert.equal(blocks[0].level, 2);
    assert.equal(blocks[0].inlines.some((item) => item.type === "text" && item.text.includes("##")), false);
    assert.deepEqual(blocks[0].inlines, [{ type: "text", text: "Senate" }]);
  }
  const paragraph = blocks[1];
  assert.equal(paragraph?.type, "p");
  if (paragraph?.type === "p") {
    const inlines = paragraph.lines.flat();
    assert.equal(inlines.some((item) => item.type === "bold"), true);
  }
  const list = blocks[2];
  assert.equal(list?.type, "ul");
  if (list?.type === "ul") {
    assert.equal(list.items[0]?.some((item) => item.type === "link"), true);
    const script = list.items[1]?.find((item) => item.type === "text");
    assert.equal(script?.type === "text" && script.text.includes("<script>"), true);
  }
  assert.equal(blocks[3]?.type, "ol");
  const skipped = JSON.stringify(blocks);
  assert.equal(skipped.includes("javascript:"), true);
  assert.equal(skipped.includes('"href":"javascript:'), false);
});

test("candidate rows prefer a stored party label and omit it when absent", () => {
  const labeled = fromCandidateItem({
    entityType: "candidate",
    candidateId: "H4CA12019",
    raceId: "2026-house-CA-07",
    displayName: "Jane Doe",
    office: "house",
    partyAffiliation: "DEM",
    partyLabel: "Democratic Party",
  });
  assert.equal(labeled?.partyLabel, "Democratic Party");
  const plain = fromCandidateItem({
    entityType: "candidate",
    candidateId: "H4CA12019",
    raceId: "2026-house-CA-07",
    displayName: "Jane Doe",
    office: "house",
    partyAffiliation: "XYZ",
  });
  assert.equal(plain?.partyLabel, null);
  const candidate: Candidate = {
    candidateId: "H4CA12019",
    raceId: "2026-house-CA-07",
    displayName: "Jane Doe",
    nameAsFiled: null,
    office: "house",
    partyAffiliation: "DEM",
    fecCandidateId: "H4CA12019",
    sourceUrl: null,
    sourceLoadedAt: null,
    updatedAt: null,
  };
  assert.equal("partyLabel" in toCandidateItem(candidate), false);
  const presented = presentCandidate({ ...candidate, partyLabel: "Democratic Party" });
  assert.equal(presented?.partyLabel, "Democratic Party");
  const unknown = presentCandidate({ ...candidate, partyAffiliation: "XYZ", partyLabel: null });
  assert.equal(unknown?.partyCode, "XYZ");
  assert.equal(unknown?.partyLabel, "XYZ");
});
