import { thumbnail } from "@/lib/site/thumbnail";
import { portraitFor } from "@/lib/site/stances";
import type { TodayCard } from "@/lib/site/today";

/** Two letters for a committee or group mark. No logo files are stored, so this is drawn, not copied. */
export function groupInitials(group: string): string {
  const words = group
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(for|the|of|and|inc|llc|a)$/i.test(word));
  const letters = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "·";
}

export function FeedImage({ card }: { card: Pick<TodayCard, "personId" | "personName" | "group"> }) {
  const photo = card.personId ? portraitFor(card.personId) : null;
  if (photo) {
    return <img className="feed-thumb" src={thumbnail(photo.src)} alt="" width={64} height={64} loading="lazy" decoding="async" />;
  }
  return (
    <span className="feed-thumb feed-mark" aria-hidden="true">
      {groupInitials(card.group)}
    </span>
  );
}

export function FeedCard({ card }: { card: TodayCard }) {
  return (
    <a className="feed-card has-thumb" href={card.sourceUrl}>
      <FeedImage card={card} />
      <span className="feed-body">
        <span className="feed-title">{card.title}</span>
        <span className="feed-text">{card.text}</span>
        <span className="meta">
          {card.sourceName} · {card.when}
        </span>
      </span>
    </a>
  );
}

export function FeedGrid({ cards }: { cards: readonly TodayCard[] }) {
  return (
    <ul className="card-grid feed-grid">
      {cards.map((card) => (
        <li key={card.id}>
          <FeedCard card={card} />
        </li>
      ))}
    </ul>
  );
}
