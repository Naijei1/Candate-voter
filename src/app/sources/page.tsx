import film from "../../../data/ky-hero-film.json";
import type { Metadata } from "next";
import { withBasePath } from "@/lib/base-path";
import { DistrictVintageNote } from "@/components/site/DistrictVintageNote";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { creativeCommonsPortraits, photoAttribution } from "@/lib/site/stances";

export const metadata: Metadata = { alternates: { canonical: "/sources" }, title: "Sources" };

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
      <h2>Kentucky counties</h2>
      <ul className="plain-list">
        <li><a href="https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_5m.zip">Census county boundaries</a> · 2023</li>
        <li><a href="https://www2.census.gov/programs-surveys/decennial/rdo/mapping-files/2027/120-congressional-district-befs/">Census block assignments for the 120th Congress</a></li>
        <li><a href="https://elect.ky.gov/About-Us/Pages/County-Clerks.aspx">State Board of Elections county clerk directory</a> · Nov 22, 2026</li>
      </ul>
      <p><a className="action-link" href={withBasePath("/openapi.yaml")}>API documentation</a></p>
      <h2>Media credits</h2>
      <p>The homepage film uses trimmed, muted excerpts. The opening landscape and archival shots are cropped.</p>
      <ul className="plain-list">
        {film.map((clip) => (
          <li key={clip.sourceUrl}>
            <a href={clip.sourceUrl}>{clip.title}</a> · {clip.author} · <a href={clip.licenseUrl}>{clip.license}</a>
          </li>
        ))}
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
