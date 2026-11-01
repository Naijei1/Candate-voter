import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLE_PAC } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Campaign Finance" };

export default function FinancePage() {
  return (
    <article className="wrap">
      <h1>Campaign finance</h1>
      <p>
        Live receipts, spending, and cash on hand are not connected. Form 2 filings are statements
        of candidacy, not fundraising totals. Amounts below are a layout sample and are not anyone’s
        money.
      </p>
      <section className="card">
        <h2>Direct contributions</h2>
        <p>
          <StatusMark kind="sample" />
          {SAMPLE_PAC.direct}
        </p>
      </section>
      <section className="card">
        <h2>Outside spending</h2>
        <p>
          <StatusMark kind="sample" />
          {SAMPLE_PAC.outside}
        </p>
      </section>
      <p>
        <Link href={SAMPLE_PAC.path}>Open the sample PAC profile</Link>
      </p>
    </article>
  );
}
