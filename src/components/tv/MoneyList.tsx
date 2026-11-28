import Link from "next/link";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { lastName } from "@/lib/tv/party";
import type { RaceView } from "@/lib/tv/people";
import { outsideSpending } from "@/lib/tv/race-extra";
import { PartyTag } from "./bits";
import { ExtLink } from "./ExtLink";
import { largestFirst, lowerFirst } from "./Funding";

function dollars(value: number): string {
  return formatMoney(Math.round(value)).replace(/\.00$/, "");
}

/** Each campaign in a race: total raised and its largest source in words, then a link to who gave. */
export function MoneyList({ race, level = 3 }: { race: RaceView; level?: 3 | 4 }) {
  const outside = outsideSpending(race);
  const Sub = level === 3 ? "h3" : "h4";
  return (
    <>
      <ul className="mlist">
        {race.people.map((person) => {
          const row = person.funding;
          const ok = row?.status === "ok" && row.receipts != null;
          const top = ok && row ? largestFirst(row)[0] : null;
          return (
            <li key={person.id}>
              <p className="ml-h">
                <Link href={`/candidates/${person.id}`}>{person.name}</Link> <PartyTag party={person.party} size="sm" />
              </p>
              {ok && row ? (
                <p>
                  Raised <b className="num">{shortMoney(row.receipts ?? 0)}</b>.{top ? ` ${top.amount * 2 > (row.receipts ?? 0) ? "Most" : "The largest share"} came from ${lowerFirst(top.label)}.` : null}
                </p>
              ) : (
                <p className="none">No totals reported to the Federal Election Commission.</p>
              )}
              {ok && (row?.receipts ?? 0) > 0 ? (
                <Link className="btn outline sm" href={`/finance/candidates/${person.id}`}>
                  Who gives to {lastName(person.name)}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      {outside.length > 0 ? (
        <>
          <Sub className="sub-h">Outside groups</Sub>
          <p className="sec-sub">Groups that spent on their own, not money the campaigns received.</p>
          <ul className="outlist">
            {outside.map((row) => (
              <li key={row.person.id}>
                <p className="outl">
                  For {row.person.name}: <b className="num">{dollars(row.support)}</b>
                </p>
                <p className="outl">
                  Against {row.person.name}: <b className="num">{dollars(row.oppose)}</b>
                </p>
              </li>
            ))}
          </ul>
          <details className="srcd">
            <summary>Sources</summary>
            <ul className="srcl-list">
              {outside.map((row) => (
                <li key={row.person.id}>
                  <ExtLink className="xl" href={row.sourceUrl} icon>
                    FEC outside spending, {row.person.name}
                  </ExtLink>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </>
  );
}
