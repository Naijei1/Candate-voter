import { recentKentuckyPosts } from "@/lib/site/x-posts";
import { todayMoney, type TodayCard } from "@/lib/site/today";

export async function TodayOnCandate() {
  const [posts, money] = await Promise.all([recentKentuckyPosts(), todayMoney()]);
  const moneyEmpty = money.spending.length === 0 && money.receipts.length === 0 && money.filings.length === 0;
  return (
    <section className="today" aria-labelledby="today-heading">
      <h2 id="today-heading">Today on Candate</h2>
      <p>Records stored for Kentucky candidates on the November ballot. This is not a news roundup.</p>
      {posts ? (
        <div>
          <h3>Posts on X</h3>
          {posts.length === 0 ? <p>No recent posts are on file.</p> : null}
          <ul className="card-grid">
            {posts.map((post) => (
              <li className="card" key={post.id}>
                <p>{post.text}</p>
                <p className="hint">
                  {post.name} @{post.handle} · {post.createdAt} · <a href={post.url}>X</a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h3>Money reported to the FEC</h3>
        {moneyEmpty ? <p>Nothing new is stored.</p> : null}
        {money.spending.length > 0 ? (
          <>
            <h4>Independent expenditures</h4>
            <CardList cards={money.spending} />
          </>
        ) : null}
        {money.receipts.length > 0 ? (
          <>
            <h4>Committee receipts</h4>
            <CardList cards={money.receipts} />
          </>
        ) : null}
        {money.filings.length > 0 ? (
          <>
            <h4>Filings</h4>
            <CardList cards={money.filings} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function CardList({ cards }: { cards: TodayCard[] }) {
  return (
    <ul className="card-grid">
      {cards.map((card) => (
        <li className="card" key={card.id}>
          <h4>{card.title}</h4>
          <p>{card.text}</p>
          <p className="hint">
            {card.when} · <a href={card.sourceUrl}>{card.sourceName}</a>
          </p>
        </li>
      ))}
    </ul>
  );
}
