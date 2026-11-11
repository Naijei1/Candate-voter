import type { Metadata } from "next";
import Link from "next/link";
import { latestNews } from "@/lib/site/ky-news";
import { recentKentuckyPosts } from "@/lib/site/x-posts";
import { todayMoney, type TodayCard } from "@/lib/site/today";

export const metadata: Metadata = { title: "Updates" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ lane?: string }> };

export default async function UpdatesPage({ searchParams }: PageProps) {
  const lane = (await searchParams).lane === "reporting" ? "reporting" : "activity";
  const [money, posts, stories] = await Promise.all([
    todayMoney(12),
    recentKentuckyPosts(),
    lane === "reporting" ? latestNews(12) : Promise.resolve([]),
  ]);
  const cards = [...money.spending, ...money.receipts, ...money.filings];
  return (
    <article className="wrap">
      <h1>Updates</h1>
      <p className="lede">
        What Kentucky candidates on the November ballot reported, from records this site stores.
      </p>
      <div className="tabs" role="tablist" aria-label="Update lanes">
        <Link href="/updates" aria-selected={lane === "activity"} role="tab">
          Activity
        </Link>
        <Link href="/updates?lane=reporting" aria-selected={lane === "reporting"} role="tab">
          Reporting
        </Link>
      </div>
      {lane === "activity" ? (
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="sr-only">
            Activity
          </h2>
          {posts && posts.length > 0 ? (
            <ul className="card-grid">
              {posts.map((post) => (
                <li key={post.id}>
                  <a className="feed-card" href={post.url}>
                    <h3>{post.name}</h3>
                    <p>{post.text}</p>
                    <p className="meta">
                      {post.createdAt} · X · @{post.handle}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {cards.length === 0 ? <p>Nothing new is stored.</p> : <CardList cards={cards} />}
        </section>
      ) : (
        <section aria-labelledby="reporting-heading">
          <h2 id="reporting-heading">Reporting</h2>
          <p>Kentucky Lantern stories. This is journalism from outside the site.</p>
          {stories.length === 0 ? (
            <p>The Kentucky Lantern feed could not be loaded.</p>
          ) : (
            <ul className="plain-list">
              {stories.map((story) => (
                <li key={story.url}>
                  <a href={story.url}>{story.title}</a>
                  <span className="hint"> Kentucky Lantern{story.date ? ` · ${story.date}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </article>
  );
}

function CardList({ cards }: { cards: TodayCard[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <a className="feed-card" href={card.sourceUrl}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <p className="meta">
              {card.when} · {card.sourceName}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}
