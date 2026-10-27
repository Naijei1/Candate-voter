import type { Filing } from "../types";

/**
 * Drop Form 2 rows that are the same document.
 * The same image number is one filing. Otherwise the same candidate, race,
 * load timestamp, source URL, and filed date are one filing even when a
 * second file number was stored. The newest load timestamp is kept.
 * Distinct file numbers with different timestamps stay.
 */
export function collapseIdenticalFilings(filings: readonly Filing[]): Filing[] {
  const ordered = [...filings].sort(byNewest);
  const seen = new Set<string>();
  const unique: Filing[] = [];
  for (const filing of ordered) {
    const key = duplicateKey(filing);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(filing);
  }
  return unique;
}

function byNewest(a: Filing, b: Filing): number {
  const byLoad = (b.fecLoadTimestamp ?? "").localeCompare(a.fecLoadTimestamp ?? "");
  if (byLoad !== 0) return byLoad;
  return b.filingId.localeCompare(a.filingId);
}

function duplicateKey(filing: Filing): string {
  const image = filing.imageNumber?.trim() ?? "";
  if (image) return `${filing.candidateId}|image|${image}`;
  return [
    filing.candidateId,
    filing.raceId,
    filing.formType,
    filing.fecLoadTimestamp ?? "",
    filing.filedAt ?? "",
    filing.sourceUrl ?? "",
  ].join("|");
}
