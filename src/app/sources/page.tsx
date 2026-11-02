import type { Metadata } from "next";
import Link from "next/link";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";

export const metadata: Metadata = { title: "About this data" };

const ROWS = [
  ["FEC Form 2 name, party, filing", "Working", "OpenFEC, about every 6 hours."],
  ["House and Senate contest list", "Working", "Even-year structure plus stored filings."],
  ["ZIP to House district", "Limited", "Census. Not a full ballot."],
  ["District shapes and ZIP", "Working", "Both use Census 120th districts, January 1, 2026."],
  ["Ballot qualification", "Planned", "A filing is not a place on the ballot."],
  ["State, county, city, judicial, school", "Awaiting", "Templates only. elect.ky.gov was not readable, so no names were copied."],
  ["Ballot measures", "Sample", "Layout only."],
  ["Photos, biography, issues", "Awaiting", "Not invented."],
  ["Polls and fundraising", "Polls: sample. Fundraising: FEC totals.", "OpenFEC candidate totals and Schedule E aggregates. Direct and outside spending are not added."],
  ["Alerts", "Planned", "Saved per account after sign-in. Email delivery is planned."],
] as const;

export default function SourcesPage() {
  return (
    <article className="wrap">
      <h1>About this data</h1>
      <p className="lede">Federal names are FEC Form 2 filings. Gaps stay empty.</p>
      <DistrictVintageNote />
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Status</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row[0]}>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
              <td>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link href="/chat">Ask about stored filings</Link>
      </p>
    </article>
  );
}
