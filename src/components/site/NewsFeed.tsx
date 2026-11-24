"use client";

/* eslint-disable @next/next/no-img-element -- RSS supplies attributed HTTPS images on the publisher's host. */
import { FeedCard } from "@/components/site/FeedCard";
import { FeedCorrection } from "@/components/site/FeedCorrection";
import { ageLabel } from "@/lib/format";
import { activityCards } from "@/lib/site/news-activity";
import type { NewsItem } from "@/lib/site/ky-news";
import type { TodayCard } from "@/lib/site/today";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/news/news.module.css";

export type NewsData = {
  filings: TodayCard[];
  receipts: TodayCard[];
  spending: TodayCard[];
  press: NewsItem[];
  reporting: NewsItem[];
  candidates: { id: string; name: string }[];
};

export function NewsBrowser({ data }: { data: NewsData }) {
  const params = useSearchParams();
  const lane = params.get("lane") === "reporting" ? "reporting" : "activity";
  const candidate = data.candidates.some((person) => person.id === params.get("candidate")) ? params.get("candidate") ?? "" : "";
  return <NewsView data={data} lane={lane} candidate={candidate} />;
}

export function NewsView({ data, lane, candidate }: { data: NewsData; lane: "activity" | "reporting"; candidate: string }) {
  const router = useRouter();
  function go(nextLane: "activity" | "reporting", nextCandidate: string) {
    const query = new URLSearchParams();
    if (nextLane === "reporting") query.set("lane", "reporting");
    if (nextCandidate) query.set("candidate", nextCandidate);
    router.replace(query.size ? `/news?${query}` : "/news", { scroll: false });
  }
  const stories = (lane === "reporting" ? data.reporting : data.press)
    .filter((story) => !candidate || story.personIds.includes(candidate))
    .slice(0, 12);
  const cards = lane === "activity" ? activityCards(data, candidate) : [];
  const items = [
    ...cards.map((card) => ({ id: card.id, date: card.date ?? "", node: <FeedCard card={card} /> })),
    ...stories.map((story) => ({ id: story.url, date: story.date, node: <StoryCard story={story} reporting={lane === "reporting"} /> })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <nav className="segmented" aria-label="News Feed lanes">
        <button type="button" aria-current={lane === "activity" ? "page" : undefined} onClick={() => go("activity", candidate)}>
          Activity
        </button>
        <button type="button" aria-current={lane === "reporting" ? "page" : undefined} onClick={() => go("reporting", candidate)}>
          Reporting
        </button>
      </nav>
      <search>
        <form className={`finder-row ${styles.filter}`} onSubmit={(event) => event.preventDefault()}>
          <div className={styles.field}>
            <label htmlFor="news-candidate">Candidate</label>
            <select
              id="news-candidate"
              name="candidate"
              value={candidate}
              onChange={(event) => go(lane, event.currentTarget.value)}
            >
              <option value="">All candidates</option>
              {data.candidates.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-navy" type="submit">Filter</button>
        </form>
      </search>
      <section className={styles.items} aria-label={lane === "reporting" ? "Reporting" : "Activity"}>
        {items.length ? (
          <ul className="card-grid feed-grid">
            {items.map((item) => <li key={item.id} className="grid grid-rows-[1fr_auto]">{item.node}</li>)}
          </ul>
        ) : candidate ? <p>No {lane} for this candidate.</p> : null}
      </section>
    </>
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
        <span className="feed-kicker">{reporting ? "Reporting" : "Candidate says"}</span>
        <span className="feed-title">{story.title}</span>
        <span className="meta">
          {story.source}<span className="meta-date"> · <time dateTime={story.date}>{ageLabel(story.date)}</time></span>
        </span>
      </a>
      <FeedCorrection sourceUrl={story.url} />
    </>
  );
}
