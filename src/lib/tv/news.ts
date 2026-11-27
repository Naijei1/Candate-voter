import { kyPerson } from "@/lib/site/ky-ballot";
import { latestNews, latestPress, type NewsItem } from "@/lib/site/ky-news";
import { raceShort } from "./people";

export type NewsKind = "stmt" | "rpt" | "opinion";

export type FeedItem = NewsItem & {
  kind: NewsKind;
  kindLabel: "Statement" | "Reporting" | "Commentary";
  cats: string[];
  /** Races the item is about, from its race tags and the people it names. */
  races: Array<{ raceId: string; short: string }>;
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
  const commentary = !press && /^commentary:\s*/i.test(item.title);
  const kind: NewsKind = press ? "stmt" : commentary ? "opinion" : "rpt";
  const cats = TOPICS.filter(([, pattern]) => pattern.test(item.title)).map(([id]) => id);
  if (press) cats.unshift("statements");
  return {
    ...item,
    title: commentary ? item.title.replace(/^commentary:\s*/i, "") : item.title,
    kind,
    kindLabel: kind === "stmt" ? "Statement" : kind === "opinion" ? "Commentary" : "Reporting",
    cats,
    races: relatedRaces(item),
  };
}

function relatedRaces(item: NewsItem): FeedItem["races"] {
  const ids = new Set(item.raceIds);
  for (const id of item.personIds) {
    const race = kyPerson(id)?.race.raceId;
    if (race) ids.add(race);
  }
  return [...ids].sort().map((raceId) => ({ raceId, short: raceShort(raceId) }));
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
