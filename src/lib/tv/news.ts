import { latestNews, latestPress, type NewsItem } from "@/lib/site/ky-news";

export type NewsKind = "stmt" | "rpt" | "com";

export type FeedItem = NewsItem & {
  kind: NewsKind;
  kindLabel: "Statement" | "Reporting" | "Commentary";
  cats: string[];
};

const TOPICS: Array<[string, RegExp]> = [
  ["finance", /\b(raised|fundrais\w*|campaign finance|spent|spending|donor|money|FEC)\b/i],
  ["pac", /\b(PACs?|super PAC|outside (?:group|spending))\b/i],
  ["polls", /\bpolls?\b|\bpolling\b|\bsurvey\b/i],
  ["debates", /\bdebates?\b|\bforum\b/i],
  ["measures", /\b(amendment|ballot measure|ballot question)\b/i],
  ["deadlines", /\b(deadline|early voting|register|registration|absentee|polls open)\b/i],
];

export const NEWS_TOPICS = [
  { id: "statements", label: "Candidate statements" },
  { id: "finance", label: "Campaign finance" },
  { id: "pac", label: "PAC activity" },
  { id: "polls", label: "Polls" },
  { id: "debates", label: "Debates" },
  { id: "measures", label: "Ballot measures" },
  { id: "deadlines", label: "Election deadlines" },
] as const;

function classify(item: NewsItem, press: boolean): FeedItem {
  const kind: NewsKind = press ? "stmt" : /^commentary:/i.test(item.title) ? "com" : "rpt";
  const cats = TOPICS.filter(([, pattern]) => pattern.test(item.title)).map(([id]) => id);
  if (press) cats.unshift("statements");
  return {
    ...item,
    kind,
    kindLabel: kind === "stmt" ? "Statement" : kind === "com" ? "Commentary" : "Reporting",
    cats,
  };
}

/** Reporting and official statements, newest first. Result headlines stay out until results are visible. */
export async function newsFeed(): Promise<FeedItem[]> {
  const [reporting, press] = await Promise.all([latestNews(40), latestPress(20)]);
  return [...reporting.map((item) => classify(item, false)), ...press.map((item) => classify(item, true))].sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  );
}

export async function newsForPerson(id: string): Promise<FeedItem[]> {
  return (await newsFeed()).filter((item) => item.personIds.includes(id));
}

export async function newsForRace(raceId: string, personIds: readonly string[]): Promise<FeedItem[]> {
  const feed = await newsFeed();
  return feed.filter((item) => item.raceIds.includes(raceId) || item.personIds.some((id) => personIds.includes(id)));
}

/** Race ids an item is about, including statements tied to a candidate. */
export function itemRaces(item: FeedItem, raceOf: (personId: string) => string | null): string[] {
  const ids = new Set(item.raceIds);
  for (const id of item.personIds) {
    const race = raceOf(id);
    if (race) ids.add(race);
  }
  return [...ids];
}
