import { isKentuckyFinanceRow } from "@/lib/site/ky-finance";
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
  const direct = selectDirect(bundle.direct.filter(isKentuckyFinanceRow), null);
  const outside = selectOutside(bundle.outside.filter(isKentuckyFinanceRow), null);
  const named = orgLabel(bundle.direct[0]?.committeeName ?? bundle.outside[0]?.committeeName ?? null);
  const title = named ?? "Campaign group";

  return (
    <article className="wrap">
      <p>
        <Link href="/finance">Campaign finance</Link>
      </p>
      <h1>{title}</h1>
      {named ? null : <p className="hint">FEC ID {committeeId}</p>}
      {direct.length > 0 ? (
        <>
          <h2>Campaign finance</h2>
          <DirectList rows={direct} />
        </>
      ) : null}
      {outside.length > 0 ? (
        <>
          <h2>Outside spending</h2>
          <OutsideList rows={outside} />
        </>
      ) : null}
    </article>
  );
}
