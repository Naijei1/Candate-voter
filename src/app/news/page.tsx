import type { Metadata } from "next";
import { NewsFeed } from "@/components/tv/client/NewsFeed";
import { YoursLink } from "@/components/tv/client/Yours";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { NEWS_TOPICS, newsFeed } from "@/lib/tv/news";
import { allRaces } from "@/lib/tv/people";

export const metadata: Metadata = { alternates: { canonical: "/news" }, title: "News and Updates" };
export const revalidate = 3600;

export default async function NewsPage() {
  const items = await newsFeed();
  const races = allRaces().map((race) => ({ raceId: race.raceId, title: race.title, district: race.office === "house" ? Number(race.district) : null }));
  const sources = [...new Map(items.map((item) => [item.source, item])).values()];
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "News and Updates" }]} />
      <h1 className="t-h1 pt">News and Updates</h1>
      {items.length ? (
        <NewsFeed items={items} topics={NEWS_TOPICS} races={races} />
      ) : (
        <div className="empty">
          <p className="empty-t">No news in our records yet.</p>
        </div>
      )}
      <p className="page-f">
        <YoursLink className="btn primary">
          <Icon name="pin" size="sm" />
          Find my races
        </YoursLink>
      </p>
      {sources.length ? (
        <p className="src">
          Source:{" "}
          {sources.map((item, index) => (
            <span key={item.source}>
              {index ? "; " : ""}
              <ExtLink className="xl" href={item.sourceUrl} icon>
                {item.source}
              </ExtLink>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
