/**
 * Plain, readable committee names from FEC filings, which are stored in all caps.
 * "KEEP AMERICA GREAT PAC, INC." -> "Keep America Great PAC, Inc."
 * "RJC VICTORY FUND" -> "RJC Victory Fund", "MORGAN MCGARVEY FOR CONGRESS" -> "Morgan McGarvey for Congress".
 * Names that already use mixed case are returned unchanged.
 */

/** Always upper case, whatever the vowels. */
const ACRONYMS = new Set([
  "PAC", "PACS", "FEC", "GOP", "DNC", "RNC", "RJC", "NRA", "NRSC", "NRCC", "DSCC", "DCCC", "DGA", "RGA", "SEIU", "AFSCME",
  "AFL", "CIO", "LCV", "KY", "USA", "U.S.", "U.S.A.", "LLC", "II", "III", "IV", "SD", "NEA", "AFT", "UAW", "IBEW",
  "AIPAC", "NAACP", "ACLU", "AARP", "PPFA", "SBA",
]);
/** Lower case unless first. */
const SMALL = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
/** Fixed spellings. */
const SPECIAL: Record<string, string> = { INC: "Inc", CORP: "Corp", CO: "Co", LTD: "Ltd", "EMILY'S": "EMILY's" };

function capWord(word: string): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  // McGarvey, McConnell, McGrath
  if (/^mc[a-z]{2,}$/.test(lower)) return `Mc${lower.charAt(2).toUpperCase()}${lower.slice(3)}`;
  // O'Brien
  if (/^o'[a-z]{2,}$/.test(lower)) return `O'${lower.charAt(2).toUpperCase()}${lower.slice(3)}`;
  // 4TH -> 4th, 2026 stays
  if (/^\d/.test(lower)) return lower;
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

function formatToken(token: string, first: boolean): string {
  // Keep punctuation around the word: "PAC," "(KY)"
  const match = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9.']*)$/.exec(token);
  if (!match) return token;
  const [, lead, core, trail] = match;
  if (!core) return token;
  const bare = core.replace(/\.$/, "");
  const dot = core.endsWith(".") && !ACRONYMS.has(core) ? "." : "";
  if (ACRONYMS.has(core)) return `${lead}${core}${trail}`;
  if (ACRONYMS.has(bare)) return `${lead}${bare}${dot}${trail}`;
  if (SPECIAL[bare]) return `${lead}${SPECIAL[bare]}${dot}${trail}`;
  if (!first && SMALL.has(bare.toLowerCase())) return `${lead}${bare.toLowerCase()}${dot}${trail}`;
  // Hyphenated parts: "PRO-LIFE" -> "Pro-Life", "AFL-CIO" -> "AFL-CIO"
  const parts = bare.split("-").map((part) => (ACRONYMS.has(part) ? part : capWord(part)));
  return `${lead}${parts.join("-")}${dot}${trail}`;
}

export function formatOrgName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  // Mixed case means a person already typed it; keep it.
  if (/[a-z]/.test(trimmed)) return trimmed;
  return trimmed
    .split(" ")
    .map((token, index) => formatToken(token, index === 0))
    .join(" ");
}
