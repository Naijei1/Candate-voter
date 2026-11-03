import type { Metadata } from "next";
import Link from "next/link";
import { DirectList, FinanceExplanation, OutsideList } from "@/components/site/FinanceLists";
import { coverageChoices, selectDirect, selectOutside } from "@/lib/finance/present";
import { coverageKey, coverageLabel } from "@/lib/finance/model";
import { loadFinance } from "@/lib/finance/load";

export const metadata: Metadata = { title: "Campaign finance" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ cycle?: string; coverage?: string }> };

export default async function FinancePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const parsed = Number(query.cycle);
  const cycle = Number.isInteger(parsed) && parsed >= 2024 && parsed <= 2028 ? parsed : 2026;
  const bundle = await loadFinance(cycle);
  const choices = coverageChoices(bundle.direct);
  const coverage = choices.includes(query.coverage ?? "") ? query.coverage ?? null : null;
  const direct = selectDirect(bundle.direct, coverage);
  const outside = selectOutside(bundle.outside, coverage);

  return (
    <article className="wrap">
      <h1>Campaign finance</h1>
      <p className="lede">Election year {cycle}. Money campaigns report, kept separate from spending by other groups.</p>
      {bundle.notice ? <p className="notice">{bundle.notice}</p> : null}
      <FinanceExplanation />
      <nav className="filters" aria-label="Cycle and coverage">
        <Link href="/finance?cycle=2026" aria-current={cycle === 2026 && !coverage ? "page" : undefined}>
          Full 2026 reports
        </Link>
        {choices.map((key) => (
          <Link
            key={key}
            href={`/finance?cycle=${cycle}&coverage=${encodeURIComponent(key)}`}
            aria-current={coverage === key ? "page" : undefined}
          >
            {labelFor(bundle.direct, key)}
          </Link>
        ))}
      </nav>
      <h2>Money reported by campaigns</h2>
      <p>Raised, spent, cash left, and debts from each campaign report.</p>
      <DirectList rows={direct} />
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

function labelFor(rows: Parameters<typeof selectDirect>[0], key: string): string {
  const match = rows.find((row) => coverageKey(row.coverageStart, row.coverageEnd) === key);
  return match ? coverageLabel(match.coverageStart, match.coverageEnd) : key;
}
