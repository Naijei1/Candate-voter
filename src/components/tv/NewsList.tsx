import Link from "next/link";
import { dayLabel } from "@/lib/format";
import type { FeedItem } from "@/lib/tv/news";
import { ExtLink } from "./ExtLink";

export function NewsRow({ item, images = false }: { item: FeedItem; images?: boolean }) {
  return (
    <li className="nitem" data-cats={item.cats.join(" ")} data-races={item.races.map((race) => race.raceId).join(" ")} data-kind={item.kind}>
      <time className="nd" dateTime={item.date}>
        {dayLabel(item.date)}
      </time>
      <div className="nb">
        <span className="nchips">
          <span className={`ntype ${item.kind}`}>{item.kindLabel}</span>
          {item.races.length > 0 ? (
            <span className="nrel">
              {item.races.map((race) => (
                <Link key={race.raceId} className="rtag" href={`/races/${race.raceId}`}>
                  {race.short}
                </Link>
              ))}
            </span>
          ) : null}
        </span>
        <ExtLink className="nt" href={item.url} icon>
          {item.title}
        </ExtLink>
        <p className="nm">
          <span>{item.source}</span>
        </p>
      </div>
      {images && item.image ? <img className="nimg" src={item.image.url} alt="" loading="lazy" decoding="async" width={160} height={107} /> : null}
    </li>
  );
}

export function NewsList({ items, big, images }: { items: FeedItem[]; big?: boolean; images?: boolean }) {
  return (
    <ul className={big ? "news big" : "news"}>
      {items.map((item) => (
        <NewsRow key={item.url} item={item} images={images} />
      ))}
    </ul>
  );
}
