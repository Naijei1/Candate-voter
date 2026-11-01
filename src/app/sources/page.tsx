import type { Metadata } from "next";
import Link from "next/link";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Sources and methodology" };

const ROWS = [
  ["Federal filer name, party, FEC id, filing PDF", "Working", "OpenFEC electronic Form 2, refreshed about every six hours. Last checked is the ingest watermark."],
  ["House and Senate contest list", "Working", "Even-year ballot structure in this app, plus stored filings. An empty contest is not a hidden name."],
  ["ZIP to congressional district", "Working, limited", "Census TIGERweb. Not a full ballot. Not a stored address."],
  ["District shapes", "Working, vintage conflict", "119th Congress file on the map. 120th Congress layer on ZIP lookup."],
  ["Ballot qualification", "Planned", "Not connected. A Form 2 does not prove a name is on the ballot. Kentucky’s election office is the intended source."],
  ["State, county, city, judicial, school", "Planned", "No source is connected. Filters say so."],
  ["Ballot measure text", "Sample", "The measure page is a layout, not a certified question."],
  ["Photos, biography, issues, quotes", "Awaiting content", "Not invented. The race assistant prototype does not retrieve them."],
  ["Polls", "Planned", "No vendor. Pages say when no qualifying poll is available."],
  ["Fundraising and PACs", "Sample", "Separate direct contributions from outside spending. Not loaded from FEC totals yet."],
  ["News and alerts", "Preview", "On-page only. No email or push."],
  ["Accounts and corrections desk", "Planned", "The report button does not send a report yet."],
] as const;

export default function SourcesPage() {
  return (
    <article className="wrap">
      <h1>Sources and methodology</h1>
      <p>
        Federal names come from stored FEC Form 2 filings. If that read fails, the site says so and
        does not fill in sample candidates. “Last checked” is the time the ingest cursor was
        written. A failed run should stay visible rather than look current.
      </p>
      <DistrictVintageNote />
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Status</th>
            <th>Source and fallback</th>
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
        <StatusMark kind="preview" />
        Questions about stored filings, not about issues or debates, can use the filings assistant:{" "}
        <Link href="/chat">Ask about stored FEC filings</Link>. Developer documentation for the read
        API is on <Link href="/agent">a separate page</Link>.
      </p>
      <p>
        Hosting stays on Amplify Hosting for this Next.js app. Phase 1 does not add a new AWS
        stack. Recurring cost at the current filing volume is mostly hosting. The FEC and Census
        calls in use do not have a data license fee. A future polling or ballot file would be a
        separate cost and is not included.
      </p>
    </article>
  );
}
