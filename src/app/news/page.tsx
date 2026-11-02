import type { Metadata } from "next";
import { NewsFeed } from "@/components/site/NewsFeed";

export const metadata: Metadata = { title: "News and Updates" };

export default function NewsPage() {
  return (
    <article className="wrap">
      <h1>News</h1>
      <p className="lede">What you follow here is the feed. Alerts are a separate choice.</p>
      <NewsFeed />
    </article>
  );
}
