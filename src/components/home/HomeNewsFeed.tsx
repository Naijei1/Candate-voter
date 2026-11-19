import Link from "next/link";
import { FeedGrid } from "@/components/site/FeedCard";
import { recentKentuckyPosts } from "@/lib/site/x-posts";
import { todayMoney } from "@/lib/site/today";

/** Home "News Feed" section. Built from records this site stores, not outside news. */
export async function HomeNewsFeed() {
  const [posts, money] = await Promise.all([recentKentuckyPosts(), todayMoney()]);
  const cards = [...money.spending, ...money.receipts, ...money.filings].slice(0, 6);
  return (
    <section className="home-section" aria-labelledby="feed-heading">
      <div className="section-head">
        <h2 id="feed-heading">News Feed</h2>
        <Link className="section-more" href="/news">
          See the full News Feed <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="lede">What Kentucky candidates on the November ballot reported, from records this site stores.</p>
      {posts && posts.length > 0 ? (
        <div>
          <h3>Posts on X</h3>
          <ul className="card-grid feed-grid">
            {posts.map((post) => (
              <li key={post.id}>
                <a className="feed-card" href={post.url}>
                  <span className="feed-title">{post.name}</span>
                  <span className="feed-text">{post.text}</span>
                  <span className="meta">
                    {post.createdAt} · X · @{post.handle}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {cards.length === 0 ? <p>Nothing new is stored.</p> : <FeedGrid cards={cards} />}
    </section>
  );
}
