import type { PersonFiling } from "./person-filings";

/**
 * One sentence when the same person has more than one Form 2.
 * A single filing stays quiet. The row itself is never removed.
 */
export function personFilingNote(filings: readonly PersonFiling[]): string | null {
  if (filings.length < 2) return null;
  const fecIds = [
    ...new Set(filings.map((row) => row.fecId).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const offices = officeSummary(filings);
  const writeIn = filings.some((row) => row.writeIn);
  const lead = writeIn ? "Same person, including a write-in." : "Same person, more than one Form 2.";
  const where = offices ? ` Filed for ${offices}.` : "";
  const ids = fecIds.length > 0 ? ` FEC ${fecIds.slice(0, 6).join(", ")}.` : "";
  return `${lead}${where}${ids}`;
}

function officeSummary(rows: readonly PersonFiling[]): string {
  const parts: string[] = [];
  if (rows.some((row) => row.office === "president")) parts.push("President");
  if (rows.some((row) => row.office === "senate")) parts.push("Senate");
  const houses = [
    ...new Set(
      rows
        .filter((row) => row.office === "house")
        .map((row) => row.district)
        .filter((district): district is string => Boolean(district)),
    ),
  ];
  if (houses.length === 1) {
    parts.push(houses[0] === "00" ? "the at-large House seat" : `House district ${Number(houses[0])}`);
  } else if (houses.length > 1) {
    parts.push("more than one House district");
  } else if (rows.some((row) => row.office === "house")) {
    parts.push("House");
  }
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
