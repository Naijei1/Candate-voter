import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import calendar from "../../../../data/ky-election-calendar.json";
import { FollowButton } from "@/components/tv/client/Follow";
import { CountyPicker, DistrictPicker, ZoomBox } from "@/components/tv/client/Maps";
import { ReportButton } from "@/components/tv/client/Report";
import { Tabs } from "@/components/tv/client/Tabs";
import { Crumbs } from "@/components/tv/bits";
import { ExtLink } from "@/components/tv/ExtLink";
import { Icon } from "@/components/tv/Icon";
import { RaceCards, RaceRow, candidateCount } from "@/components/tv/RaceCard";
import { ElectionStatus } from "@/components/tv/Status";
import { stateName } from "@/lib/data/states";
import { KY_BALLOT_SOURCES } from "@/lib/site/ky-ballot";
import { dayLabel, longDayLabel } from "@/lib/format";
import { STATE_TILES } from "@/lib/geo/state-tiles";
import { stateMap } from "@/lib/geo/state-maps";
import { outlineMap } from "@/lib/geo/uncovered";
import { enabledStates, isStateCode, stateConfig, type StateConfig } from "@/lib/states";
import { MY_RACES_CRUMB } from "@/lib/tv/nav";
import { allRaces, type RaceView } from "@/lib/tv/people";

export const revalidate = 3600;
export const runtime = "nodejs";

type PageProps = { params: Promise<{ state: string }> };

type CalendarRow = { label: string; date: string; sourceUrl: string; sourceName: string };

function covered(code: string): StateConfig | null {
  return isStateCode(code) && stateConfig(code).enabled ? stateConfig(code) : null;
}

export function generateStaticParams() {
  return Object.keys(STATE_TILES).map((code) => ({ state: code.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const code = (await params).state.toUpperCase();
  if (!(code in STATE_TILES)) return { title: "State not found" };
  const state = covered(code);
  return {
    alternates: { canonical: `/states/${code.toLowerCase()}` },
    title: state ? `${state.name} federal races` : `${stateName(code)}: coming later`,
    description: state ? `U.S. Senate and House races in ${state.name}, with maps by district and county.` : undefined,
    robots: state ? undefined : { index: false },
  };
}

function Silhouette({ viewBox, paths }: { viewBox: string; paths: string[] }) {
  return (
    <svg className="sil" viewBox={viewBox} aria-hidden="true">
      {paths.map((d, index) => (
        <path key={index} d={d} fillRule="evenodd" />
      ))}
    </svg>
  );
}

function StateTitle({ code, name, title = name, silhouette }: { code: string; name: string; title?: string; silhouette: React.ReactNode }) {
  return (
    <div className="stitle">
      <div className="sname">
        {silhouette}
        <h1 className="t-h1">{title}</h1>
      </div>
      <FollowButton id={`state-${code}`} name={name} />
    </div>
  );
}

function Stats({ items }: { items: Array<[string, string | number]> }) {
  return (
    <dl className="stats">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SetHead({ id, race }: { id: string; race: RaceView }) {
  return (
    <div className="sec-head">
      <div>
        <h2 id={id} className="sec-t">
          Candidates for {race.office === "senate" ? race.title : race.title.replace("U.S. ", "")}
        </h2>
        {race.subtitle ? <p className="sec-sub">{race.subtitle}</p> : null}
      </div>
      <Link className="viewall" href={`/races/${race.raceId}`}>
        Race page
        <Icon name="right" size="sm" />
      </Link>
    </div>
  );
}

function CoveredState({ state }: { state: StateConfig }) {
  const map = stateMap(state.code);
  const races = allRaces(state);
  const senate = races.find((race) => race.office === "senate") ?? null;
  const house = races.filter((race) => race.office === "house");
  const houseCount = house.reduce((sum, race) => sum + race.people.length, 0);
  const rows = calendar as CalendarRow[];
  const general = state.generalElection;
  const generalShort = dayLabel(general).replace(/, \d{4}$/, "");
  const split = map.counties.filter((county) => county.districts.length > 1).length;
  const compact = new Set<string>(state.mapHints.compactLabelDistricts);
  const filingSource = (
    <ExtLink className="xl" href={state.filings.href} icon>
      {state.filings.name} filings
    </ExtLink>
  );

  const statewide = (
    <div className="sw-g">
      <div className="sw-l">
        <ZoomBox>
          <svg className="kymap" viewBox={map.viewBox} role="img" aria-label={`${state.name}. Every county votes in the U.S. Senate race.`}>
            {map.counties.map((county) => (
              <path key={county.fips} className="cty in" d={county.d} />
            ))}
          </svg>
        </ZoomBox>
        <div className="legend">
          <span>
            <i className="sw in" />
            Votes in the U.S. Senate race: every county
          </span>
        </div>
        <Stats
          items={[
            ["Senate seat on the ballot", senate ? 1 : 0],
            ["Candidates", senate?.people.length ?? 0],
            [`General election, ${state.cycle}`, generalShort],
          ]}
        />
      </div>
      <div className="sw-r">
        {senate ? (
          <div className="sec">
            <SetHead id="h-sen" race={senate} />
            <RaceCards race={senate} className="c3" />
          </div>
        ) : (
          <p className="none">No Senate race on the ballot this year.</p>
        )}
      </div>
    </div>
  );

  const statewidePanel = (
    <>
      {statewide}
      <p className="src">
        Source: {filingSource}
        {KY_BALLOT_SOURCES.slice(1).map((source) => (
          <span key={source.url}>
            ;{" "}
            <ExtLink className="xl" href={source.url} icon>
              {source.name === "Clerk of the House" ? "Clerk of the House nominations" : source.name}
            </ExtLink>
          </span>
        ))}
      </p>
      <div className="sec">
        <div className="sec-head">
          <div>
            <h2 id="h-hs" className="sec-t">
              U.S. House races
            </h2>
            <p className="sec-sub">Your district decides which one is on your ballot.</p>
          </div>
          <Link className="viewall" href={`/states/${state.slug}?view=congressional`}>
            View All
            <Icon name="right" size="sm" />
          </Link>
        </div>
        <div className="rlist">
          {house.map((race) => (
            <RaceRow key={race.raceId} race={race} />
          ))}
        </div>
      </div>
    </>
  );

  const congressional = (
    <DistrictPicker
      viewBox={map.districtViewBox}
      title={`${state.name}’s ${map.districts.length} congressional districts`}
      districts={map.districts.map((district) => {
        const race = house.find((item) => item.district === district.code);
        return {
          ...district,
          small: compact.has(district.code),
          href: race ? `/races/${race.raceId}` : "#",
          label: `House District ${district.number}, ${candidateCount(race?.people.length ?? 0)}`,
        };
      })}
      sets={Object.fromEntries(
        house.map((race) => [
          race.district ?? race.raceId,
          <>
            <SetHead id={`h-d${Number(race.district)}`} race={race} />
            <RaceCards race={race} />
          </>,
        ]),
      )}
      after={
        <>
          <Stats
            items={[
              ["House seats on the ballot", house.length],
              ["Candidates", houseCount],
              [`General election, ${state.cycle}`, generalShort],
            ]}
          />
          <p className="src">
            Source: {filingSource}
            {map.districtSource ? (
              <>
                ;{" "}
                <ExtLink className="xl" href={map.districtSource} icon>
                  Census Bureau district files
                </ExtLink>
              </>
            ) : null}
          </p>
        </>
      }
    />
  );

  const initial = map.counties.find((county) => county.name === "Fayette")?.fips ?? map.counties[0]?.fips ?? "";
  const county = (
    <CountyPicker
      viewBox={map.viewBox}
      counties={map.counties.map(({ fips, name, d, districts, clerk, clerkUrl }) => ({ fips, name, d, districts, clerk, clerkUrl }))}
      initial={initial}
      statewide={senate ? <RaceRow race={senate} /> : null}
      rows={Object.fromEntries(house.map((race) => [String(Number(race.district)), <RaceRow key={race.raceId} race={race} />]))}
      after={
        <Stats
          items={[
            ["Counties", map.counties.length],
            ["Split between two districts", split],
            [`General election, ${state.cycle}`, generalShort],
          ]}
        />
      }
    />
  );

  return (
    <>
      <div className="wrap">
        <Crumbs items={[{ href: "/", label: "Home" }, MY_RACES_CRUMB, { label: `All ${state.name} races` }]} />
        <StateTitle code={state.code} name={state.name} title={`All ${state.name} races`} silhouette={<Silhouette viewBox={map.districtViewBox} paths={map.districts.map((district) => district.d)} />} />
        <ElectionStatus />
        <Tabs
          label="Map level"
          param="view"
          listClass="seg"
          tabs={[
            { id: "statewide", label: "Statewide", panel: statewidePanel },
            { id: "congressional", label: "Congressional", panel: congressional },
            { id: "county", label: "County", panel: county },
          ]}
        />
        <section className="sec" id="dates" aria-labelledby="h-dates">
          <div className="sec-head">
            <div>
              <h2 id="h-dates" className="sec-t">
                Key dates
              </h2>
            </div>
            <ExtLink className="viewall" href={state.results.official.href}>
              See official results
            </ExtLink>
          </div>
          <ol className="dates">
            {rows.map((row) => (
              <li key={row.label}>
                <time dateTime={row.date}>{longDayLabel(row.date)}</time>
                <span>{row.label}</span>
              </li>
            ))}
          </ol>
          <p className="src">
            Source:{" "}
            {[...new Map(rows.map((row) => [row.sourceUrl, row])).values()].map((row, index) => (
              <span key={row.sourceUrl}>
                {index ? "; " : ""}
                <ExtLink className="xl" href={row.sourceUrl} icon>
                  {row.sourceName === "KY State Board of Elections" ? `${row.sourceName} calendar` : row.sourceName}
                </ExtLink>
              </span>
            ))}
          </p>
        </section>
        <p className="page-f">
          <ReportButton>
            <Icon name="flag" size="sm" />
            Report an error
          </ReportButton>
          <Link href="/sources#coverage">Coverage status</Link>
        </p>
      </div>
    </>
  );
}

function UncoveredState({ code }: { code: string }) {
  const name = stateName(code);
  const outline = outlineMap(code);
  const home = enabledStates()[0];
  const slots = outline.count === 1 ? ["At large"] : Array.from({ length: outline.count }, (_, index) => `District ${index + 1}`);
  return (
    <>
      <div className="wrap">
        <Crumbs items={[{ href: "/", label: "Home" }, { href: "/states", label: "States" }, { label: name }]} />
        <StateTitle code={code} name={name} silhouette={outline.districts.length ? <Silhouette viewBox={outline.viewBox} paths={outline.districts.map((district) => district.d)} /> : null} />
        <p className="cov-line">
          <span className="covtag">Coming later</span> {name} is not covered yet. This page shows its districts, with no candidate data.
        </p>
        {outline.districts.length ? (
          <div className="mapbox plain">
            <svg
              className="ohmap"
              viewBox={outline.viewBox}
              role="img"
              aria-label={`${name}’s ${outline.count === 1 ? "at-large district" : `${outline.count} congressional districts`}, outlines only`}
            >
              {outline.districts.map((district) => (
                <g key={district.district}>
                  <path d={district.d} fillRule="evenodd" />
                  {outline.count > 1 ? (
                    <text x={district.labelX} y={district.labelY}>
                      {Number(district.district)}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
          </div>
        ) : null}
        <div className="legend">
          <span>
            <i className="sw" />
            District outline, 119th Congress
          </span>
        </div>
        <dl className="stats">
          <div>
            <dt>U.S. House districts</dt>
            <dd>{outline.count || "—"}</dd>
          </div>
          <div>
            <dt>Candidates on file</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd className="sm">Not yet</dd>
          </div>
        </dl>
        <p className="src">
          District count:{" "}
          <ExtLink className="xl" href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html" icon>
            U.S. Census Bureau, 119th Congress boundaries
          </ExtLink>
        </p>
        <div className="sec">
          <div className="sec-head">
            <div>
              <h2 className="sec-t">U.S. House races</h2>
            </div>
          </div>
          <ul className="slots">
            {slots.map((slot) => (
              <li key={slot}>
                <b>{slot}</b>
                <span>Awaiting verified filings</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sec">
          <div className="sec-head">
            <div>
              <h2 className="sec-t">Before a state is covered</h2>
            </div>
          </div>
          <ul className="checks">
            {["Candidate filings from the state election office", "Campaign reports from the FEC", "District and county maps", "Election dates from the state calendar"].map((item) => (
              <li key={item}>
                <Icon name="check" size="sm" />
                {item}
              </li>
            ))}
          </ul>
          {home ? (
            <p>
              <Link className="btn primary" href={`/states/${home.slug}`}>
                See {home.name}, which is covered
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default async function StatePage({ params }: PageProps) {
  const raw = (await params).state;
  const code = raw.toUpperCase();
  if (raw !== raw.toLowerCase() || !(code in STATE_TILES)) notFound();
  const state = covered(code);
  return state ? <CoveredState state={state} /> : <UncoveredState code={code} />;
}
