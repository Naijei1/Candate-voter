import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectList, OutsideList } from "@/components/site/FinanceLists";
import { financeForCommittee, loadFinance } from "@/lib/finance/load";
import { selectDirect, selectOutside } from "@/lib/finance/present";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ committeeId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = (await params).committeeId;
  return { title: id };
}

export default async function CommitteeFinancePage({ params }: PageProps) {
  const committeeId = (await params).committeeId.trim().toUpperCase();
  if (!/^C\d{8}$/.test(committeeId)) notFound();
  const bundle = financeForCommittee(await loadFinance(2026), committeeId);
  const direct = selectDirect(bundle.direct, null);
  const outside = selectOutside(bundle.outside, null);
  const title = direct[0]?.committeeName ?? outside[0]?.committeeName ?? committeeId;

  return (
    <article className="wrap">
      <p>
        <Link href="/finance">Campaign finance</Link>
      </p>
      <h1>{title}</h1>
      {bundle.notice ? <p className="notice">{bundle.notice}</p> : null}
      <p>
        <Link href="/finance#direct-and-outside">Direct money and outside spending are not added together.</Link>
      </p>
      {direct.length === 0 && outside.length === 0 ? <p>No FEC totals stored for this committee.</p> : null}
      {direct.length > 0 ? (
        <>
          <h2>Committee reports</h2>
          <DirectList rows={direct} />
        </>
      ) : null}
      {outside.length > 0 ? (
        <>
          <h2>Independent expenditures</h2>
          <OutsideList rows={outside} />
        </>
      ) : null}
    </article>
  );
}
