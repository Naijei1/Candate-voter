import type { Metadata } from "next";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { creativeCommonsPortraits, photoAttribution } from "@/lib/site/stances";

export const metadata: Metadata = { title: "Sources" };

export default function SourcesPage() {
  return (
    <article className="wrap">
      <h1>Sources</h1>
      <h2>Kentucky&apos;s 2026 federal elections</h2>
      <ul className="plain-list">
        <li><a href={KY_BALLOT_SOURCES[0].url}>Kentucky Secretary of State candidate filings</a> · Nov 3, 2026</li>
        <li><a href={KY_BALLOT_SOURCES[1].url}>Clerk of the House nominee list</a> · Oct 8, 2026</li>
        <li><a href={KY_BALLOT_SOURCES[2].url}>FEC campaign totals</a> · Through Oct 14, 2026</li>
        <li><a href="https://www.fec.gov/data/independent-expenditures/">FEC outside spending</a></li>
      </ul>
      <DistrictVintageNote />
      <h2>Media credits</h2>
      <ul className="plain-list">
        <li>
          Edmond Dantès, Pexels · <a href="https://www.pexels.com/video/people-voting-7103537/">People voting</a>
          {" · "}<a href="https://www.pexels.com/video/woman-putting-his-vote-on-a-ballot-box-7103427/">Ballot box</a>
        </li>
        {creativeCommonsPortraits().map(([id, photo]) => (
          <li key={id}><a href={photo.sourceUrl}>{photoAttribution(photo)}</a> · Wikimedia Commons</li>
        ))}
      </ul>
      <h2>Glossary</h2>
      <ul className="plain-list">
        <li><strong>Open seat</strong> — No current officeholder is running.</li>
        <li><strong>Outside spending</strong> — Spending by groups outside a campaign.</li>
      </ul>
    </article>
  );
}
