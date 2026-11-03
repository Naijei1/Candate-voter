import type { Metadata } from "next";
import Link from "next/link";
import { orgLabel } from "@/components/site/FinanceLists";
import { formatMoney } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";

export const metadata: Metadata = { title: "Example PAC profile" };
export const dynamic = "force-dynamic";

const EXAMPLE_ID = "C00896365";

export default async function ExamplePacPage() {
  const bundle = await loadFinance(2026);
  const rows = bundle.outside.filter((row) => row.committeeId === EXAMPLE_ID);
  const name = orgLabel(rows[0]?.committeeName ?? null) ?? "KEEP AMERICA GREAT PAC, INC.";
  return (
    <article className="wrap">
      <p className="notice">
        Example profile. These lines are stored FEC independent expenditures for 2026. They are not a full committee report. Advertisements and endorsements are not stored.
      </p>
      <h1>{name}</h1>
      <p>
        Committee id {EXAMPLE_ID}. Spending below is money this group reported spending on its own. It is not money a campaign received.
      </p>
      {rows.length === 0 ? <p>No outside-spending rows for this committee are stored.</p> : null}
      <ul className="plain-list">
        {rows.map((row) => (
          <li key={`${row.candidateId}-${row.support}`}>
            {row.support === "support" ? "Supports" : "Opposes"} {row.candidateName ?? row.candidateId}: {formatMoney(row.total)}
            {row.count != null ? ` across ${row.count} reports` : ""}.
            {row.sourceUrl ? (
              <>
                {" "}
                <a href={row.sourceUrl}>FEC independent expenditure record</a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <p>
        <Link className="btn btn-navy" href="/finance">
          Back to campaign finance
        </Link>
      </p>
    </article>
  );
}
