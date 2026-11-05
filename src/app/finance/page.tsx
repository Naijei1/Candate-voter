import type { Metadata } from "next";
import Link from "next/link";
import { DirectList, FinanceExplanation, OutsideList } from "@/components/site/FinanceLists";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { coverageKey } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";

export const metadata: Metadata = { title: "Campaign finance" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ cycle?: string; coverage?: string; page?: string }> };

const PAGE_SIZE = 20;

function isKentucky(row: { candidateId: string; raceId: string | null }): boolean {
  return row.candidateId.includes("KY") || Boolean(row.raceId?.includes("KY"));
}

export default async function FinancePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const parsed = Number(query.cycle);
  const cycle = Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2028 ? parsed : 2026;
  const bundle = await loadFinance(cycle);
  const kentuckyDirect = bundle.direct.filter(isKentucky);
  const kentuckyOutside = bundle.outside.filter(isKentucky);
  const latestKey = [...kentuckyDirect]
    .filter((row) => row.coverageEnd)
    .sort((a, b) => (a.coverageEnd ?? "").localeCompare(b.coverageEnd ?? ""))
    .at(-1);
  const latest = latestKey ? coverageKey(latestKey.coverageStart, latestKey.coverageEnd) : null;
  const coverage = query.coverage === "latest" && latest ? latest : null;
  const directAll = selectDirect(kentuckyDirect, coverage);
  const outside = coverage ? [] : selectOutside(kentuckyOutside, null);
  const pageCount = Math.max(1, Math.ceil(directAll.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(query.page) || 1));
  const direct = directAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <article className="wrap">
      <h1>Campaign finance</h1>
      <p className="lede">Kentucky, election year {cycle}. Money campaigns report, kept separate from spending by other groups.</p>
      {bundle.notice ? <p className="notice">{bundle.notice}</p> : null}
      <FinanceExplanation />
      <form className="finder-row" method="get" action="/finance">
        <label htmlFor="finance-cycle">
          Election cycle
          <select id="finance-cycle" name="cycle" defaultValue={String(cycle)}>
            <option value="2026">2026</option>
          </select>
        </label>
        <label htmlFor="finance-period">
          Reporting period
          <select id="finance-period" name="coverage" defaultValue={query.coverage === "latest" ? "latest" : ""}>
            <option value="">Whole cycle</option>
            {latest ? <option value="latest">Latest report, through {latestKey?.coverageEnd}</option> : null}
          </select>
        </label>
        <button className="btn btn-navy" type="submit">
          Apply
        </button>
      </form>
      <p>
        <Link href="/finance/example">Example PAC profile</Link>
      </p>
      <h2>Money reported by campaigns</h2>
      <p>Raised, spent, cash left, and debts from each campaign report.</p>
      <DirectList rows={direct} />
      {pageCount > 1 ? (
        <p className="actions">
          {page > 1 ? <Link className="btn btn-ghost" href={`/finance?cycle=${cycle}${query.coverage === "latest" ? "&coverage=latest" : ""}&page=${page - 1}`}>Previous</Link> : null}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? <Link className="btn btn-ghost" href={`/finance?cycle=${cycle}${query.coverage === "latest" ? "&coverage=latest" : ""}&page=${page + 1}`}>Next</Link> : null}
        </p>
      ) : null}
      <h2>Spending by other groups</h2>
      {coverage ? (
        <p>That spending is totaled for the whole year, so it is hidden for one reporting period.</p>
      ) : (
        <p>Money other groups spent on their own. It is not added to the money campaigns raised.</p>
      )}
      <OutsideList rows={outside} />
    </article>
  );
}
