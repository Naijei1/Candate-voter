import type { Metadata } from "next";
import calendar from "../../../data/ky-election-calendar.json";
import film from "../../../data/ky-hero-film.json";
import stanceData from "../../../data/ky-stances.json";
import { ReportButton } from "@/components/tv/client/Report";
import { SourceFilter } from "@/components/tv/client/SourceFilter";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { dayLabel } from "@/lib/format";
import { KY_BALLOT_CHECKED, KY_BALLOT_SOURCES, kyPerson } from "@/lib/site/ky-ballot";
import { KY_CONGRESSIONAL_ROSTER_SOURCE } from "@/lib/site/ky-officeholders";
import { kyStatewide } from "@/lib/site/ky-statewide";
import { profileVoteSelection } from "@/lib/site/profiles";
import { allPortraits } from "@/lib/site/stances";
import { stateConfig } from "@/lib/states";
import { newsFeed } from "@/lib/tv/news";

export const metadata: Metadata = { alternates: { canonical: "/sources" }, title: "Sources and methodology" };
export const revalidate = 3600;

type Status = "working" | "demonstration" | "awaiting" | "planned";
const STATUS_LABEL: Record<Status, string> = { working: "Working", demonstration: "Demonstration", awaiting: "Awaiting content", planned: "Planned" };

export default async function SourcesPage() {
  const state = stateConfig();
  const news = await newsFeed();
  const newsChecked = news
    .map((item) => item.retrievedAt)
    .sort()
    .at(-1);
  const newsSources = [...new Map(news.map((item) => [item.source, item])).values()];
  const coverage: Array<[string, Status, string, string]> = [
    [`${state.name} federal candidates (Senate, House)`, "working", `${state.filings.name}; Clerk of the House`, `Checked by hand, last ${dayLabel(KY_BALLOT_CHECKED)}`],
    ["Campaign money (raised, spent, cash on hand)", "working", "FEC candidate totals and committee reports", "Each FEC filing deadline"],
    ["Outside spending", "working", "FEC independent expenditures", "Each FEC filing deadline"],
    ["Issue positions", "working", "Candidate websites, questionnaires, official offices", `Last checked ${dayLabel(stanceData.checkedOn)}`],
    ["House voting records", "working", "House Clerk roll calls", `Last checked ${dayLabel(profileVoteSelection.checkedOn)}`],
    ["News", "working", newsSources.map((item) => item.source).join("; ") || "No feeds", newsChecked ? `Snapshot, ${dayLabel(newsChecked)}` : "Not applicable"],
    ["Ask", "demonstration", "Matches questions to this site’s records", "Same as the records"],
    ["Follow and alerts", "demonstration", "Saved on this device; nothing is sent", "Not applicable"],
    ["Report an error", "working", "Sent to THE VOTE’s corrections inbox", "Not applicable"],
    ["PAC profile", "working", "FEC rows for each PAC", "Each FEC filing deadline"],
    ["Polls", "awaiting", "No qualifying polls found", "Reviewed with each update"],
    ["Ballot measures", "awaiting", `${state.filings.name}, once certified`, "Not applicable"],
    ["Endorsements", "awaiting", "Endorsers’ own statements", "Not applicable"],
    ["State, county, city, judicial and school-board contests", "planned", "State and county election offices", "Not applicable"],
    ["Other states", "planned", "Each state election office", "Not applicable"],
  ];
  const groups: Array<{ title: string; links: Array<{ label: string; url: string }> }> = [
    {
      title: "Election offices",
      links: [
        { label: `${state.filings.name}, candidate filings`, url: state.filings.href },
        { label: `${state.results.sourceName}, ${state.cycle} election calendar`, url: calendar[0].sourceUrl },
        { label: `${state.results.sourceName}, official results`, url: state.results.official.href },
        { label: `${state.results.sourceName}, county clerks`, url: "https://elect.ky.gov/About-Us/Pages/County-Clerks.aspx" },
      ],
    },
    {
      title: "Congress",
      links: [
        { label: `Clerk of the House, ${state.cycle} nominations`, url: KY_BALLOT_SOURCES[1].url },
        { label: "House Clerk roll-call votes", url: "https://clerk.house.gov/Votes" },
        { label: "Congress legislators, current members", url: KY_CONGRESSIONAL_ROSTER_SOURCE },
      ],
    },
    {
      title: "Campaign money",
      links: [
        { label: `FEC candidate totals, ${state.name} ${state.cycle}`, url: `https://www.fec.gov/data/candidates/?election_year=${state.cycle}&state=${state.code}` },
        { label: "FEC committee reports and filings", url: "https://www.fec.gov/data/committees/" },
        { label: "FEC independent expenditures", url: "https://www.fec.gov/data/independent-expenditures/" },
      ],
    },
    {
      title: "Maps",
      links: [
        { label: "Census Bureau, 120th Congress district files", url: "https://www2.census.gov/programs-surveys/decennial/rdo/mapping-files/2027/120-congressional-district-befs/cd120.zip" },
        { label: "Census Bureau, county boundaries 2023", url: "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_5m.zip" },
        { label: "Census Bureau, 119th Congress boundaries", url: "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" },
      ],
    },
    { title: "News", links: newsSources.map((item) => ({ label: item.source, url: item.sourceUrl })) },
  ];
  const { senators, officers } = kyStatewide();
  const officials = [...senators, ...officers];
  const portraits = allPortraits();
  const credits = [
    ...portraits.map(([id, photo]) => {
      const official = officials.find((person) => person.id === id);
      return { key: id, name: kyPerson(id)?.person.name ?? (official ? `${official.name}, ${official.office}` : id), author: photo.author, license: photo.license, url: photo.sourceUrl };
    }),
    ...officials
      .filter((person) => !portraits.some(([id]) => id === person.id))
      .flatMap((person) =>
        person.photo ? [{ key: person.id, name: `${person.name}, ${person.office}`, author: person.photo.credit, license: person.photo.license, url: person.photo.sourceUrl }] : [],
      ),
    ...film.map((clip) => ({ key: clip.sourceUrl, name: `Home film, “${clip.title}”`, author: clip.author, license: clip.license, url: clip.sourceUrl })),
  ];
  return (
    <div className="wrap">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Sources and methodology" }]} />
      <h1 className="t-h1 pt">Sources and methodology</h1>
      <p className="lede">Where every fact and photo on THE VOTE comes from, and what is live.</p>
      <nav className="jump" aria-label="On this page">
        <a href="#coverage">Coverage status</a>
        <a href="#method">How we check</a>
        <a href="#list">Sources</a>
        <a href="#credits">Photo credits</a>
        <a href="#independence">Independence</a>
      </nav>
      <section className="sec" id="coverage" aria-labelledby="h-cov">
        <div className="sec-head">
          <div>
            <h2 id="h-cov" className="sec-t">
              Coverage status
            </h2>
          </div>
        </div>
        <div className="tscroll" role="region" aria-labelledby="h-cov" tabIndex={0}>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Status</th>
                <th scope="col">Source</th>
                <th scope="col" className="hide-m">
                  Refresh
                </th>
              </tr>
            </thead>
            <tbody>
              {coverage.map(([feature, status, source, refresh]) => (
                <tr key={feature}>
                  <th scope="row">{feature}</th>
                  <td>
                    <span className={`cov ${status}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td>{source}</td>
                  <td className="hide-m">{refresh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="sec" id="method" aria-labelledby="h-m">
        <div className="sec-head">
          <div>
            <h2 id="h-m" className="sec-t">
              How we check
            </h2>
          </div>
        </div>
        <ul className="checks">
          {[
            "Every fact links to its official record or to the candidate’s own words.",
            "A candidate’s claims are labelled as theirs and kept apart from verified facts.",
            "Each data block shows when it was last checked. If a source fails, we say so.",
            "Federal filings, state filings, ballot status and photos are checked separately.",
            "We show no race ratings, margins or vote counts.",
          ].map((line) => (
            <li key={line}>
              <Icon name="check" size="sm" />
              {line}
            </li>
          ))}
        </ul>
      </section>
      <SourceFilter>
        <section className="sec" id="list" aria-labelledby="h-l">
          <div className="sec-head">
            <div>
              <h2 id="h-l" className="sec-t">
                Sources
              </h2>
            </div>
          </div>
          <div className="field sf">
            <label htmlFor="sfilter" className="sr">
              Filter sources
            </label>
            <input className="input" id="sfilter" type="search" placeholder="Filter sources and credits…" />
          </div>
          <div className="sgrid">
            {groups
              .filter((group) => group.links.length)
              .map((group, index) => (
                <section className="sgroup" data-sgroup key={group.title} aria-labelledby={`sg-${index}`}>
                  <h3 id={`sg-${index}`}>{group.title}</h3>
                  <ul className="srclist">
                    {group.links.map((link) => (
                      <li key={link.url} data-s={link.label.toLowerCase()}>
                        <ExtLink href={link.url} icon>
                          {link.label}
                        </ExtLink>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        </section>
        <section className="sec" id="credits" aria-labelledby="h-med">
          <div className="sec-head">
            <div>
              <h2 id="h-med" className="sec-t">
                Photo credits
              </h2>
            </div>
          </div>
          <div className="tscroll" role="region" aria-labelledby="h-med" tabIndex={0}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Image</th>
                  <th scope="col" className="hide-m">
                    Author
                  </th>
                  <th scope="col">License</th>
                  <th scope="col">Link</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((row) => (
                  <tr key={row.key} data-s={`${row.name} ${row.author}`.toLowerCase()}>
                    <td>{row.name}</td>
                    <td className="hide-m">{row.author}</td>
                    <td>{row.license}</td>
                    <td>
                      <ExtLink href={row.url} icon label={`Source for ${row.name}`}>
                        Source
                      </ExtLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </SourceFilter>
      <section className="sec" id="independence" aria-labelledby="h-ind">
        <div className="sec-head">
          <div>
            <h2 id="h-ind" className="sec-t">
              Independence and affiliations
            </h2>
          </div>
        </div>
        <div className="empty sm">
          <p className="empty-t">Awaiting approved text.</p>
          <p>THE VOTE’s statement on ownership, funding and affiliations will appear here.</p>
        </div>
      </section>
      <p className="page-f">
        <ReportButton>
          <Icon name="flag" size="sm" />
          Report an error
        </ReportButton>
      </p>
    </div>
  );
}
