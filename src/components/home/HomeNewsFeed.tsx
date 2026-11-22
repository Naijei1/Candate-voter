import Link from "next/link";
import { FeedGrid } from "@/components/site/FeedCard";
import { todayMoney } from "@/lib/site/today";

export function loadHomeNewsFeed() {
  return todayMoney();
}

/** Home "News Feed" section, built from FEC filings. */
export function HomeNewsFeed({ data }: { data: Awaited<ReturnType<typeof loadHomeNewsFeed>> }) {
  const cards = [...data.filings, ...data.receipts, ...data.spending].slice(0, 6);
  if (!cards.length) return null;
  return (
    <section className="home-section" aria-labelledby="feed-heading">
      <div className="section-head">
        <h2 id="feed-heading">News Feed</h2>
        <Link className="section-more" href="/news">
          See the full News Feed <span aria-hidden="true">→</span>
        </Link>
      </div>
      {cards.length > 0 ? <FeedGrid cards={cards} /> : null}
    </section>
  );
}
