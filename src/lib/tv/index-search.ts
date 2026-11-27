/** Client-safe search over the site index. No data imports here. */

export type IndexEntry = {
  /** Group heading. */
  g: "Pages" | "Races" | "Candidates" | "Committees";
  /** Title. */
  t: string;
  /** Short context line. */
  s: string;
  /** Link. */
  h: string;
  /** Icon for pages and races. */
  i?: "home" | "ballot" | "news" | "money" | "ask" | "building" | "pin" | "info";
  /** Small portrait for people, or null when none is stored. */
  img?: string | null;
};

export function scoreEntry(entry: IndexEntry, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = entry.t.toLowerCase();
  if (title.startsWith(q)) return 4;
  if (title.split(/[\s,.()"-]+/).some((word) => word.startsWith(q))) return 3;
  if (title.includes(q)) return 2;
  if (entry.s.toLowerCase().includes(q)) return 1;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((word) => `${title} ${entry.s.toLowerCase()}`.includes(word))) return 1;
  return 0;
}

export function searchIndex(entries: readonly IndexEntry[], query: string, limit = 20): IndexEntry[] {
  return entries
    .map((entry) => [entry, scoreEntry(entry, query)] as const)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([entry]) => entry);
}

export function looksLikeQuestion(text: string): boolean {
  return /\?$/.test(text) || /^(who|what|how|where|when|why|which|is|are|does|did|can|will)\b/i.test(text) || text.trim().split(/\s+/).length >= 4;
}
