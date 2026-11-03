import type { Metadata } from "next";
import { NewsFeed } from "@/components/site/NewsFeed";

export const metadata: Metadata = { title: "News and Updates" };

export default function NewsPage() {
  return (
    <article className="wrap">
      <h1>News</h1>
      <p className="lede">Choose what you want to see later. This does not turn on email alerts.</p>
      <NewsFeed />
    </article>
  );
}
