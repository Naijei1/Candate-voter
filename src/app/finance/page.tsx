import type { Metadata } from "next";
import Link from "next/link";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Campaign finance" };

export default function FinancePage() {
  return (
    <article className="wrap">
      <h1>Campaign finance</h1>
      <p className="lede">
        <StatusMark kind="sample" /> Not loaded from filings.
      </p>
      <div className="card-grid">
        <section className="card">
          <h2>Direct contributions</h2>
          <p>Money given to a campaign.</p>
        </section>
        <section className="card">
          <h2>Outside spending</h2>
          <p>Money spent about a candidate, not given to them.</p>
        </section>
      </div>
      <p>
        <Link className="btn btn-navy" href="/finance/committees/example-pac">
          Sample PAC
        </Link>
      </p>
    </article>
  );
}
