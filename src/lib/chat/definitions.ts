import type { ChatAnswer } from "./types";

const RACE_ID = /\b(?:19|20)\d{2}-(?:president|senate-[A-Z]{2}|house-[A-Z]{2}-\d{2})\b/;

const LOOKUP =
  /\b(?:compare|list every|who(?:'s| is| are) running|who filed|which candidates)\b/i;

const OFFER =
  "Name a state or race and I can look up the FEC Form 2 filings stored for it.";

const PRIMARY_AND_GENERAL = `A **primary** is how a party chooses its nominee. A **general election** is the later contest for the office, usually in November, among those nominees and anyone else on the ballot.

Those are the election stages. They are not the same as an FEC filing. ${OFFER}`;

const FILING = `A **statement of candidacy (Form 2)** is the form someone files with the FEC to say they intend to run for a federal office. It is not the final ballot and not an endorsement.

Candate-voter stores those electronic filings. ${OFFER}`;

const HOUSE_DISTRICT = `Each state is split into U.S. **House districts**. Voters in a district elect one representative. A few states have one **at-large** seat for the whole state instead of numbered districts.

The House seat is not the statewide Senate seat. ${OFFER}`;

const WRITE_IN = `A **write-in candidate** is someone voters can vote for by writing the name in, even when that name is not printed on the ballot.

A Form 2 can still list them as a write-in (party code WRI or W). That filing means they told the FEC they intend to run. It does not by itself put them on the printed ballot. ${OFFER}`;

/**
 * Short civic explanation for a novice question that does not ask for a
 * stored roster. Lookup questions ("who is running in Kentucky") return null
 * so the records path can answer them.
 */
export function definitionAnswer(message: string): ChatAnswer | null {
  const text = message.trim();
  if (!text || wantsRecords(text)) return null;
  const markdown = explanationFor(text);
  if (!markdown) return null;
  return {
    answer_markdown: markdown,
    sources: [],
    refused: false,
    mode: "factual",
  };
}

function wantsRecords(message: string): boolean {
  if (RACE_ID.test(message)) return true;
  return LOOKUP.test(message);
}

function explanationFor(message: string): string | null {
  const asks =
    /\b(?:what(?:'s| is| are)|what(?:'s| is) the difference|how does|how do|explain|define)\b/i.test(
      message,
    );
  if (!asks && !(/\bprimar(?:y|ies)\b/i.test(message) && /\bgeneral\b/i.test(message))) {
    return null;
  }
  if (/\bwrite[-\s]?ins?\b/i.test(message) && /\b(what|define|explain|mean)\b/i.test(message)) {
    return WRITE_IN;
  }
  if (
    /\b(form\s*2|statement of candidacy)\b/i.test(message) ||
    (/\bfiling\b/i.test(message) && /\b(what|mean|explain)\b/i.test(message))
  ) {
    return FILING;
  }
  if (/\b(house district|congressional district)\b/i.test(message)) return HOUSE_DISTRICT;
  if (/\bprimar(?:y|ies)\b/i.test(message) && /\bgeneral\b/i.test(message)) {
    return PRIMARY_AND_GENERAL;
  }
  return null;
}
