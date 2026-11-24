"use client";

import { DirectList, OutsideList } from "@/components/site/FinanceLists";
import { dayLabel } from "@/lib/format";
import { selectDirect, selectOutside } from "@/lib/finance/present";
import type { FinanceDirect, FinanceOutside } from "@/lib/finance/model";
import { useRouter, useSearchParams } from "next/navigation";

const PAGE_SIZE = 20;

export type FinanceData = {
  directAll: FinanceDirect[];
  outsideAll: FinanceOutside[];
  latest: string | null;
  latestEnd: string;
  cycle: number;
};

export function FinanceBrowser({ data }: { data: FinanceData }) {
  const params = useSearchParams();
  const coverage = params.get("coverage") === "latest" && data.latest ? "latest" : "";
  const pageCount = pageCountFor(data, coverage);
  const requested = Number(params.get("page")) || 1;
  const page = Math.min(pageCount, Math.max(1, requested));
  return <FinanceView data={data} coverage={coverage} page={page} />;
}

export function FinanceView({ data, coverage, page }: { data: FinanceData; coverage: "" | "latest"; page: number }) {
  const router = useRouter();
  const pageCount = pageCountFor(data, coverage);
  const current = Math.min(pageCount, Math.max(1, page));
  const selected = coverage === "latest" ? data.latest : null;
  const directAll = selectDirect(data.directAll, selected);
  const outside = coverage === "latest" ? [] : selectOutside(data.outsideAll, null);
  const direct = directAll.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function go(nextCoverage: "" | "latest", nextPage: number) {
    const query = new URLSearchParams();
    query.set("cycle", String(data.cycle));
    if (nextCoverage === "latest") query.set("coverage", "latest");
    if (nextPage > 1) query.set("page", String(nextPage));
    router.replace(`/finance?${query}`, { scroll: false });
  }

  return (
    <>
      <form className="finder-row" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="finance-cycle">
          Election cycle
          <select id="finance-cycle" name="cycle" value={String(data.cycle)} onChange={() => go(coverage, 1)}>
            <option value="2026">2026</option>
          </select>
        </label>
        <label htmlFor="finance-period">
          Reporting period
          <select
            id="finance-period"
            name="coverage"
            value={coverage}
            onChange={(event) => go(event.currentTarget.value === "latest" ? "latest" : "", 1)}
          >
            <option value="">Whole cycle</option>
            {data.latest ? <option value="latest">Latest report, through {dayLabel(data.latestEnd)}</option> : null}
          </select>
        </label>
        <button className="btn btn-navy" type="submit">Apply</button>
      </form>
      {direct.length > 0 ? <>
        <h2>Money reported by campaigns</h2>
        <DirectList rows={direct} />
      </> : null}
      {pageCount > 1 ? (
        <p className="actions">
          {current > 1 ? <button type="button" className="btn btn-ghost" onClick={() => go(coverage, current - 1)}>Previous</button> : null}
          <span>Page {current} of {pageCount}</span>
          {current < pageCount ? <button type="button" className="btn btn-ghost" onClick={() => go(coverage, current + 1)}>Next</button> : null}
        </p>
      ) : null}
      {outside.length > 0 ? <>
        <h2>Spending by other groups</h2>
        <OutsideList rows={outside} />
      </> : null}
    </>
  );
}

function pageCountFor(data: FinanceData, coverage: "" | "latest"): number {
  const selected = coverage === "latest" ? data.latest : null;
  return Math.max(1, Math.ceil(selectDirect(data.directAll, selected).length / PAGE_SIZE));
}
