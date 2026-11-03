import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectList, orgLabel, OutsideList } from "@/components/site/FinanceLists";
import { financeForCommittee, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ committeeId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Campaign group" };
}

export default async function CommitteeFinancePage({ params }: PageProps) {
  const committeeId = (await params).committeeId.trim().toUpperCase();
  if (!/^C\d{8}$/.test(committeeId)) notFound();
  const bundle = financeForCommittee(await loadFinance(2026), committeeId);
  const direct = selectDirect(bundle.direct, null);
  const outside = selectOutside(bundle.outside, null);
  const named = orgLabel(direct[0]?.committeeName ?? outside[0]?.committeeName ?? null);
  const title = named ?? "Campaign group";

  return (
    <article className="wrap">
      <p>
        <Link href="/finance">Campaign finance</Link>
      </p>
      <h1>{title}</h1>
      {bundle.notice ? <p className="notice">{bundle.notice}</p> : null}
      <p>
        <Link href="/finance#direct-and-outside">Money a campaign reports is separate from money other groups spend.</Link>
      </p>
      {named ? null : <p className="hint">Official id {committeeId}</p>}
      {direct.length === 0 && outside.length === 0 ? <p>No money totals are stored for this group.</p> : null}
      {direct.length > 0 ? (
        <>
          <h2>Money this group reported</h2>
          <DirectList rows={direct} />
        </>
      ) : null}
      {outside.length > 0 ? (
        <>
          <h2>Spending on its own</h2>
          <OutsideList rows={outside} />
        </>
      ) : null}
    </article>
  );
}
