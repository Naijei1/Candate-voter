import snapshot from "../../../data/ky-news-snapshot.json";
import { decodeHtmlEntities } from "./html-entities";
import { mentionedCandidates, mentionedRaces } from "./ky-candidate-mentions";

export type NewsItem = {
  title: string;
  url: string;
  date: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  personIds: string[];
  raceIds: string[];
  image: { url: string; credit: string } | null;
};

const LANTERN = { url: "https://kentuckylantern.com/feed/", name: "Kentucky Lantern" };
const GUTHRIE = {
  url: "https://guthrie.house.gov/news/rss.aspx",
  name: "Office of Rep. Brett Guthrie",
  personId: "H8KY02031",
};
type FeedSource = { url: string; name: string; personId?: string };

const publicationDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
});
const cache = new Map<string, { at: number; items: NewsItem[] }>();

export async function newsForNames(names: readonly string[]): Promise<NewsItem[]> {
  const ids = new Set(names.flatMap((name) => mentionedCandidates(name).map((person) => person.id)));
  if (ids.size === 0) return [];
  return (await loadFeed(LANTERN)).filter((item) => item.personIds.some((id) => ids.has(id))).slice(0, 3);
}

export async function latestNews(limit = 8, personId?: string): Promise<NewsItem[]> {
  const items = await loadFeed(LANTERN);
  return items.filter((item) => !personId || item.personIds.includes(personId)).slice(0, limit);
}

export async function latestPress(limit = 4, personId?: string): Promise<NewsItem[]> {
  if (personId && personId !== GUTHRIE.personId) return [];
  return (await loadFeed(GUTHRIE)).slice(0, limit);
}

async function loadFeed(source: FeedSource): Promise<NewsItem[]> {
  const hit = cache.get(source.url);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.items;
  const fallback = hit?.items ?? snapshot.filter((item) => item.sourceUrl === source.url);
  try {
    const response = await fetch(source.url, {
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return fallback;
    const xml = await response.text();
    if (!/<rss\b/i.test(xml)) return fallback;
    const items = parseNewsFeed(xml, source, new Date().toISOString().slice(0, 10));
    cache.set(source.url, { at: Date.now(), items });
    return items;
  } catch {
    return fallback;
  }
}

export function parseNewsFeed(xml: string, source: FeedSource, retrievedAt: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const [block] of xml.matchAll(/<item\b[^>]*>[\s\S]*?<\/item>/gi)) {
    const title = text(field(block, "title"));
    const url = sourceLink(field(block, "link"), source);
    const date = new Date(decodeHtmlEntities(field(block, "pubDate")));
    if (!title || !url || Number.isNaN(date.getTime())) continue;
    const description = text(field(block, "description"));
    const tags = [...block.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map(([, value]) => text(unwrap(value))).join(" ");
    const story = `${title} ${description} ${tags}`;
    const people = source.personId ? [] : mentionedCandidates(story);
    const raceIds = source.personId ? [] : mentionedRaces(story);
    if (!source.personId && !people.length && !raceIds.length) continue;
    items.push({
      title, url, date: publicationDay.format(date), source: source.name, sourceUrl: source.url, retrievedAt,
      personIds: source.personId ? [source.personId] : people.map((person) => person.id),
      raceIds: [...new Set([...raceIds, ...people.map((person) => person.raceId)])],
      image: source.personId ? null : leadImage(block, source),
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function field(block: string, tag: string): string {
  return unwrap(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block)?.[1] ?? "");
}

function unwrap(raw: string): string {
  const value = raw.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(value);
  return cdata ? cdata[1].trim() : value.replace(/&(?:amp|lt|gt|quot|apos);/g, decodeHtmlEntities);
}

function text(raw: string): string {
  return decodeHtmlEntities(raw).replace(/<\/?[a-z][^>]*>/gi, " ").replace(/\s+/g, " ").trim();
}

function sourceLink(value: string, source: FeedSource): string | null {
  try {
    const url = new URL(value);
    if (url.hostname !== new URL(source.url).hostname || !/^https?:$/.test(url.protocol)) return null;
    url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
}

function attribute(tag: string, name: string): string {
  const match = new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag);
  return decodeHtmlEntities(match?.[2] ?? "");
}

function leadImage(block: string, source: FeedSource): NewsItem["image"] {
  const media = block.match(/<media:(?:content|thumbnail)\b[^>]*>/i)?.[0];
  const enclosure = [...block.matchAll(/<enclosure\b[^>]*>/gi)].find(([tag]) => attribute(tag, "type").startsWith("image/"))?.[0];
  const lead = /^<figure\b[^>]*>([\s\S]*?)<\/figure>/i.exec(field(block, "content:encoded"))?.[1] ?? "";
  const image = /<img\b[^>]*>/i.exec(lead)?.[0];
  const mediaUrl = media ? attribute(media, "url") : enclosure ? attribute(enclosure, "url") : "";
  const inlineUrl = image && /\bwp-post-image\b/.test(attribute(image, "class")) ? attribute(image, "src") : "";
  const og = [...block.matchAll(/<meta\b[^>]*>/gi)].find(([tag]) => attribute(tag, "property") === "og:image")?.[0];
  const url = sourceLink(mediaUrl || inlineUrl || (og ? attribute(og, "content") : ""), source);
  const caption = text(field(lead, "figcaption"));
  const credit = text(field(block, "media:credit")) || /\(([^()]*)\)\s*$/.exec(caption)?.[1] || caption;
  const outletPhoto = /\b(?:Kentucky Lantern|States Newsroom)\b/i.test(credit) && !/\b(?:Getty|Associated Press|AP Photo)\b/i.test(credit);
  return url && outletPhoto ? { url, credit } : null;
}
