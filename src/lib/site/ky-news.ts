export type NewsItem = {
  title: string;
  url: string;
  date: string | null;
  source: string;
};

const FEED = "https://kentuckylantern.com/feed/";
const SOURCE = "Kentucky Lantern";

let cache: { at: number; items: NewsItem[] } | null = null;

/** Recent Kentucky Lantern stories that name someone on the race. Empty when the feed is down or nothing matches. */
export async function newsForNames(names: readonly string[]): Promise<NewsItem[]> {
  const needles = lastNames(names);
  if (needles.length === 0) return [];
  const items = await loadFeed();
  return items
    .filter((item) => needles.some((name) => item.title.toLowerCase().includes(name.toLowerCase())))
    .slice(0, 3);
}

/** Latest Kentucky Lantern items, not filtered to a person. Empty when the feed is down. */
export async function latestNews(limit = 8): Promise<NewsItem[]> {
  const items = await loadFeed();
  return items.slice(0, limit);
}

function lastNames(names: readonly string[]): string[] {
  const found: string[] = [];
  for (const name of names) {
    const parts = name.replace(/["“”]/g, "").split(/\s+/).filter((part) => /^[A-Za-z]{4,}$/.test(part));
    const last = parts.at(-1);
    if (last) found.push(last);
  }
  return found;
}

async function loadFeed(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < 30 * 60 * 1000) return cache.items;
  try {
    const response = await fetch(FEED, {
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return cache?.items ?? [];
    const xml = await response.text();
    const items = parseFeed(xml);
    cache = { at: Date.now(), items };
    return items;
  } catch {
    return cache?.items ?? [];
  }
}

function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const block of xml.split("<item>").slice(1, 40)) {
    const title = textField(block, "title");
    const url = textField(block, "link");
    if (!title || !url.startsWith("https://")) continue;
    const rawDate = textField(block, "pubDate");
    const parsed = rawDate ? new Date(rawDate) : null;
    items.push({
      title,
      url,
      date: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null,
      source: SOURCE,
    });
  }
  return items;
}

function textField(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block);
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  const value = (cdata?.[1] ?? plain?.[1] ?? "").trim();
  return decode(value);
}

function decode(value: string): string {
  return value
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&apos;/g, "'");
}
