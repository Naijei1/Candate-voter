import type { Metadata } from "next";
import { Suspense } from "react";
import { DatasetUpdated } from "@/components/site/DatasetUpdated";
import { NewsBrowser, NewsView, type NewsData } from "@/components/site/NewsFeed";
import { shownName } from "@/lib/site/ky-officeholders";
import { kentuckyCandidates } from "@/lib/site/ky-candidate-mentions";
import { latestNews, latestPress } from "@/lib/site/ky-news";
import { todayMoney } from "@/lib/site/today";
import styles from "./news.module.css";

export const metadata: Metadata = { alternates: { canonical: "/news" }, title: "News Feed" };
export const revalidate = 3600;

export default async function NewsFeedPage() {
  const [money, press, reporting] = await Promise.all([todayMoney(48), latestPress(12), latestNews(40)]);
  const data: NewsData = {
    filings: money.filings,
    receipts: money.receipts,
    spending: money.spending,
    press,
    reporting,
    candidates: [...kentuckyCandidates]
      .map((person) => ({ id: person.id, name: shownName(person.name, person.id) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  const updatedAt = [money.updatedAt, ...press.map((story) => story.retrievedAt), ...reporting.map((story) => story.retrievedAt)].sort().at(-1);

  return (
    <article className={`wrap ${styles.news}`}>
      <h1>News Feed</h1>
      <DatasetUpdated date={updatedAt} />
      <Suspense fallback={<NewsView data={data} lane="activity" candidate="" />}>
        <NewsBrowser data={data} />
      </Suspense>
    </article>
  );
}
