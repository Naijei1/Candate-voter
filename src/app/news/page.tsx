import type { Metadata } from "next";
import { NewsFeed } from "@/components/site/NewsFeed";
import { latestNews } from "@/lib/site/ky-news";

export const metadata: Metadata = { title: "News and Updates" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const stories = await latestNews(8);
  return (
    <article className="wrap">
      <h1>News</h1>
      <p className="lede">Kentucky Lantern stories. This does not turn on email alerts.</p>
      <h2>Kentucky Lantern</h2>
      {stories.length === 0 ? (
        <p>The Kentucky Lantern feed could not be loaded.</p>
      ) : (
        <ul className="plain-list">
          {stories.map((story) => (
            <li key={story.url}>
              <a href={story.url}>{story.title}</a>
              <span className="hint">
                {" "}
                {story.source}
                {story.date ? ` · ${story.date}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <NewsFeed />
    </article>
  );
}
