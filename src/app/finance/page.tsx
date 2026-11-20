import { isKentuckyFinanceRow } from "@/lib/site/ky-finance";
import { dayLabel } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { DirectList, OutsideList } from "@/components/site/FinanceLists";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import { coverageKey } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { MoneyCharts } from "@/components/site/MoneyCharts";
import { loadMoneyCharts } from "@/lib/site/money-charts";

export const metadata: Metadata = { title: "Candidates' Political Finances" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ cycle?: string; coverage?: string; page?: string }> };

const PAGE_SIZE = 20;

export default async function FinancePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const parsed = Number(query.cycle);
  const cycle = Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2028 ? parsed : 2026;
  const [bundle, charts] = await Promise.all([loadFinance(cycle), cycle === 2026 ? loadMoneyCharts() : null]);
  const kentuckyDirect = bundle.direct.filter(isKentuckyFinanceRow);
  const kentuckyOutside = bundle.outside.filter(isKentuckyFinanceRow);
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
      <h1>Candidates&apos; Political Finances</h1>
      <p className="lede">Money raised and spent in Kentucky&apos;s {cycle} federal races.</p>
      {charts ? (
        <section className="home-section" aria-label="Campaign finance charts">
          <MoneyCharts data={charts} showAll />
        </section>
      ) : null}
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
            {latest ? <option value="latest">Latest report, through {dayLabel(latestKey?.coverageEnd ?? "")}</option> : null}
          </select>
        </label>
        <button className="btn btn-navy" type="submit">
          Apply
        </button>
      </form>
      {direct.length > 0 ? <>
        <h2>Money reported by campaigns</h2>
        <DirectList rows={direct} />
      </> : null}
      {pageCount > 1 ? (
        <p className="actions">
          {page > 1 ? <Link className="btn btn-ghost" href={`/finance?cycle=${cycle}${query.coverage === "latest" ? "&coverage=latest" : ""}&page=${page - 1}`}>Previous</Link> : null}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? <Link className="btn btn-ghost" href={`/finance?cycle=${cycle}${query.coverage === "latest" ? "&coverage=latest" : ""}&page=${page + 1}`}>Next</Link> : null}
        </p>
      ) : null}
      {outside.length > 0 ? <>
        <h2>Spending by other groups</h2>
        <OutsideList rows={outside} />
      </> : null}
    </article>
  );
}
