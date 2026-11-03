import type { Metadata } from "next";
import Link from "next/link";
import { Term } from "@/components/site/Term";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";

export const metadata: Metadata = { title: "Where this comes from" };

export default function SourcesPage() {
  return (
    <article className="wrap">
      <h1>Where this comes from</h1>
      <p className="lede">
        Names on federal races come from candidacy paperwork filed with the election commission. Filing that paperwork
        is not the same as being printed on the ballot.
      </p>
      <h2>What you can use now</h2>
      <ul className="plain-list">
        <li>U.S. Senate and U.S. House contests, including Kentucky in 2026.</li>
        <li>A ZIP code finds those federal districts. It is not your full local ballot.</li>
        <li>Money raised and spent, when a campaign has filed a report.</li>
      </ul>
      <h2>Not here yet</h2>
      <ul className="plain-list">
        <li>State, county, city, judicial, and school-board races.</li>
        <li>Ballot questions.</li>
        <li>Polls, news stories, biographies, and photos.</li>
        <li>Email alerts. You can save a race, but nothing is emailed yet.</li>
      </ul>
      <h2>Words you may see</h2>
      <ul className="plain-list">
        <li>
          <Term tip="The Federal Election Commission. Campaigns file paperwork there.">Election commission</Term> keeps
          the federal filings.
        </li>
        <li>
          <Term tip="The person who holds the office now is not running again.">Open seat</Term> means no current
          officeholder is on the list.
        </li>
        <li>
          <Term tip="Money other groups spend on their own ads. It is not a donation to the campaign.">
            Outside spending
          </Term>{" "}
          is separate from money the campaign raised.
        </li>
      </ul>
      <DistrictVintageNote />
      <p>
        <Link className="btn btn-navy" href="/states/ky">
          See Kentucky races
        </Link>
      </p>
    </article>
  );
}
