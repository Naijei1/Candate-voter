import Link from "next/link";
import { FUNDING_PARTS } from "@/lib/finance/breakdown";
import { formatMoney, shortMoney } from "@/lib/finance/model";
import { lastName } from "@/lib/tv/party";
import type { PersonView } from "@/lib/tv/people";
import { PartyTag } from "./bits";
import { FundingBar } from "./Funding";
import { Icon } from "./Icon";

export function FundingLegend() {
  return (
    <ul className="fleg" aria-label="Bar key">
      {FUNDING_PARTS.map((part) => (
        <li key={part.key}>
          <i className={`fsw ${part.className}`} aria-hidden="true" />
          {part.label}
        </li>
      ))}
    </ul>
  );
}

/** Raised, spent, cash and the funding bar for each campaign in a race. */
export function FinanceTable({ people }: { people: PersonView[] }) {
  return (
    <div className="tscroll" role="region" aria-label="Campaign money by candidate" tabIndex={0}>
      <table className="tbl fin-tbl">
        <caption className="sr">Money reported by each campaign</caption>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col" className="r">
              Raised
            </th>
            <th scope="col" className="r">
              Spent
            </th>
            <th scope="col" className="r">
              Cash
            </th>
            <th scope="col">Where it came from</th>
            <th scope="col">Who gave</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const row = person.funding;
            const ok = row?.status === "ok" && row.receipts != null;
            return (
              <tr key={person.id}>
                <th scope="row">
                  <PartyTag party={person.party} size="sm" /> <Link href={`/candidates/${person.id}`}>{person.name}</Link>
                </th>
                {ok && row ? (
                  <>
                    <td className="r num" data-l="Raised">
                      <span title={formatMoney(Math.round(row.receipts ?? 0)).replace(/\.00$/, "")}>{shortMoney(row.receipts ?? 0)}</span>
                    </td>
                    <td className="r num" data-l="Spent">
                      <span title={formatMoney(Math.round(row.disbursements ?? 0)).replace(/\.00$/, "")}>{shortMoney(row.disbursements ?? 0)}</span>
                    </td>
                    <td className="r num" data-l="Cash">
                      <span title={formatMoney(Math.round(row.cash ?? 0)).replace(/\.00$/, "")}>{shortMoney(row.cash ?? 0)}</span>
                    </td>
                    <td className="fcell">{(row.receipts ?? 0) > 0 ? <FundingBar name={person.name} row={row} compact /> : <span className="none">$0 raised</span>}</td>
                    <td className="gv">
                      <Link className="btn outline sm" href={`/finance/candidates/${person.id}`}>
                        <Icon name="money" size="sm" />
                        Who gave<span className="sr"> to {person.name}</span>
                      </Link>
                    </td>
                  </>
                ) : (
                  <td colSpan={5}>
                    <span className="none">{row ? "No FEC totals reported for this campaign." : "No FEC committee on file."}</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
