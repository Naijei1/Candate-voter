/* eslint-disable @next/next/no-img-element -- RSS supplies attributed HTTPS images on the publisher's host. */
import type { Metadata } from "next";
import Link from "next/link";
import { DatasetUpdated } from "@/components/site/DatasetUpdated";
import { FeedCorrection } from "@/components/site/FeedCorrection";
import { FeedCard } from "@/components/site/FeedCard";
import { withBasePath } from "@/lib/base-path";
import { dayLabel } from "@/lib/format";
import { kentuckyCandidates } from "@/lib/site/ky-candidate-mentions";
import { latestNews, latestPress, type NewsItem } from "@/lib/site/ky-news";
import { todayMoney } from "@/lib/site/today";
import styles from "./news.module.css";

export const metadata: Metadata = { alternates: { canonical: "/news" }, title: "News Feed" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ lane?: string; candidate?: string }> };

function newsHref(lane: string, candidate?: string) {
  const params = new URLSearchParams();
  if (lane === "reporting") params.set("lane", lane);
  if (candidate) params.set("candidate", candidate);
  return params.size ? `/news?${params}` : "/news";
}

export default async function NewsFeedPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lane = query.lane === "reporting" ? "reporting" : "activity";
  const candidate = kentuckyCandidates.find((person) => person.id === query.candidate)?.id;
  const [money, stories] = await Promise.all(lane === "activity"
    ? [todayMoney(12, candidate), latestPress(6, candidate)]
    : [null, latestNews(40)]);
  const visibleStories = stories.filter((story) => !candidate || story.personIds.includes(candidate)).slice(0, 12);
  const cards = money ? [...money.filings, ...money.receipts, ...money.spending] : [];
  const items = [
    ...cards.map((card) => ({ id: card.id, date: card.date ?? "", card: <FeedCard card={card} /> })),
    ...visibleStories.map((story) => ({ id: story.url, date: story.date, card: <StoryCard story={story} reporting={lane === "reporting"} /> })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const updatedAt = [money?.updatedAt ?? "", ...stories.map((story) => story.retrievedAt)].sort().at(-1);

  return (
    <article className={`wrap ${styles.news}`}>
      <h1>News Feed</h1>
      <DatasetUpdated date={updatedAt} />
      <nav className="segmented" aria-label="News Feed lanes">
        <Link href={newsHref("activity", candidate)} aria-current={lane === "activity" ? "page" : undefined}>
          Activity
        </Link>
        <Link href={newsHref("reporting", candidate)} aria-current={lane === "reporting" ? "page" : undefined}>
          Reporting
        </Link>
      </nav>
      <search>
        <form className={`finder-row ${styles.filter}`} method="get" action={withBasePath("/news")}>
          {lane === "reporting" ? <input type="hidden" name="lane" value={lane} /> : null}
          <div className={styles.field}>
            <label htmlFor="news-candidate">Candidate</label>
            <select id="news-candidate" name="candidate" key={candidate ?? "all"} defaultValue={candidate ?? ""}>
              <option value="">All candidates</option>
              {[...kentuckyCandidates].sort((a, b) => a.name.localeCompare(b.name)).map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-navy" type="submit">Filter</button>
        </form>
      </search>
      <section className={styles.items} key={`${lane}:${candidate ?? "all"}`} aria-label={lane === "reporting" ? "Reporting" : "Activity"}>
        {items.length ? (
          <ul className="card-grid feed-grid">
            {items.map((item) => <li key={item.id} className="grid grid-rows-[1fr_auto]">{item.card}</li>)}
          </ul>
        ) : candidate ? <p>No {lane} for this candidate.</p> : null}
      </section>
    </article>
  );
}

function StoryCard({ story, reporting }: { story: NewsItem; reporting: boolean }) {
  return (
    <>
      <a className="feed-card" href={story.url}>
        {story.image ? (
          <figure className={styles.image}>
            <img src={story.image.url} alt="" loading="lazy" decoding="async" />
            <figcaption className="hint">{story.image.credit}</figcaption>
          </figure>
        ) : null}
        <span className="feed-title">{story.title}</span>
        <span className="meta">
          {reporting ? "Reporting" : "Candidate says"} · {story.source} · <time dateTime={story.date}>{dayLabel(story.date)}</time>
        </span>
      </a>
      <FeedCorrection sourceUrl={story.url} />
    </>
  );
}
