import { DatasetUpdated } from "@/components/site/DatasetUpdated";
import { FilingCharts } from "@/components/site/FilingCharts";
import { isKentuckyFinanceRow } from "@/lib/site/ky-finance";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FinanceBrowser, FinanceView, type FinanceData } from "@/components/site/FinanceBrowser";
import { coverageKey } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";
import { MoneyCharts } from "@/components/site/MoneyCharts";
import { loadMoneyCharts } from "@/lib/site/money-charts";

export const metadata: Metadata = { alternates: { canonical: "/finance" }, title: "Candidates' Political Finances" };
export const revalidate = 3600;

export default async function FinancePage() {
  const cycle = 2026;
  const [bundle, charts] = await Promise.all([loadFinance(cycle), loadMoneyCharts()]);
  const kentuckyDirect = bundle.direct.filter(isKentuckyFinanceRow);
  const kentuckyOutside = bundle.outside.filter(isKentuckyFinanceRow);
  const latestKey = [...kentuckyDirect]
    .filter((row) => row.coverageEnd)
    .sort((a, b) => (a.coverageEnd ?? "").localeCompare(b.coverageEnd ?? ""))
    .at(-1);
  const data: FinanceData = {
    directAll: kentuckyDirect,
    outsideAll: kentuckyOutside,
    latest: latestKey ? coverageKey(latestKey.coverageStart, latestKey.coverageEnd) : null,
    latestEnd: latestKey?.coverageEnd ?? "",
    cycle,
  };

  return (
    <article className="wrap">
      <h1>Candidates&apos; Political Finances</h1>
      <DatasetUpdated date={charts?.updatedAt ?? bundle.retrievedAt ?? [...kentuckyDirect, ...kentuckyOutside].map((row) => row.updatedAt).sort().at(-1)} />
      <p className="lede">Money raised and spent in Kentucky&apos;s {cycle} federal races.</p>
      {charts ? (
        <section className="home-section" aria-label="Campaign finance charts">
          <MoneyCharts data={charts} showAll />
        </section>
      ) : null}
      {cycle === 2026 ? <FilingCharts direct={kentuckyDirect} /> : null}
      <Suspense fallback={<FinanceView data={data} coverage="" page={1} />}>
        <FinanceBrowser data={data} />
      </Suspense>
    </article>
  );
}
