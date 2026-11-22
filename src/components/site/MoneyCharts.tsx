"use client";

import { ShortList } from "@/components/site/ShortList";
import { type CSSProperties, useId, useState } from "react";
import { shortMoney } from "@/lib/finance/model";
import { dayLabel } from "@/lib/format";
import { targetLines } from "@/lib/site/money-chart-lines";
import type { ChartCommittee, ChartRace, MoneyChartData } from "@/lib/site/money-charts";

export { shortMoney } from "@/lib/finance/model";

const FULL = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Bar share as a plain number for scaleX(); percentages in scale() are not supported by older browsers. */
function share(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Number(Math.max(0.01, value / max).toFixed(3));
}

function pct(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "0%";
  return `${Math.max(1, (value / max) * 100).toFixed(1)}%`;
}

const SERIES = [
  { key: "raised", label: "Raised" },
  { key: "spent", label: "Spent" },
  { key: "cash", label: "Cash on hand" },
] as const;

function raceMaximum(race: ChartRace) {
  return Math.max(1, ...race.people.flatMap((person) => [person.raised, person.spent, person.cash ?? 0]));
}

function RaceChart({ race, previous, showHeadline }: { race: ChartRace; previous?: ChartRace; showHeadline: boolean }) {
  const max = raceMaximum(race);
  const previousMax = previous ? raceMaximum(previous) : 1;
  return (
    <figure className={previous ? "chart chart-switched" : "chart"}>
      <figcaption className="chart-title">{race.title}</figcaption>
      {showHeadline && race.headline ? (
        <p className="chart-foot">
          {race.headline.name} <a href={race.headline.sourceUrl}>raised {shortMoney(race.headline.raised)}</a> through {dayLabel(race.headline.coverageEnd)}. {" "}
          {race.headline.outside.length ? <><a href={race.headline.outsideSourceUrl}>Outside groups spent</a> {race.headline.outside.map((item) => `${shortMoney(item.amount)} ${item.side}`).join(" and ")} {race.headline.name}. {" "}</> : null}
          <span>FEC</span>
        </p>
      ) : null}
      <ul className="chart-legend" aria-hidden="true">
        {SERIES.map((series) => (
          <li key={series.key}>
            <span className={`chart-swatch s-${series.key}`} />
            {series.label}
          </li>
        ))}
      </ul>
      <ShortList
        className="chart-rows"
        items={race.people.map((person, index) => (
          <li key={person.id} className="chart-row">
            <p className="chart-label">
              <a href={`/candidates/${person.id}`}>{person.name}</a>
            </p>
            {SERIES.map((series) => {
              const value = person[series.key];
              const barStyle = {
                transform: `scaleX(${share(value ?? 0, max)})`,
                ...(previous && { "--previous-share": share(previous.people[index]?.[series.key] ?? 0, previousMax) }),
              } as CSSProperties;
              return (
                <div key={series.key} className="chart-bar-line">
                  <span className="chart-bar-name">{series.label}</span>
                  <span className="chart-track" aria-hidden="true">
                    <span className={`chart-bar s-${series.key}`} style={barStyle} />
                  </span>
                  <span className="chart-value">{value == null ? "—" : shortMoney(value)}</span>
                </div>
              );
            })}
          </li>
        ))}
      />
      <details className="chart-table">
        <summary>View as table</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={`${race.title}: money each campaign reported, table`}>
          <table>
            <caption className="sr-only">{race.title}: money each campaign reported to the FEC</caption>
            <thead>
              <tr>
                <th scope="col">Candidate</th>
                <th scope="col">Raised</th>
                <th scope="col">Spent</th>
                <th scope="col">Cash on hand</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {race.people.map((person) => (
                <tr key={person.id}>
                  <th scope="row">{person.name}</th>
                  <td>{FULL.format(person.raised)}</td>
                  <td>{FULL.format(person.spent)}</td>
                  <td>{person.cash == null ? "—" : FULL.format(person.cash)}</td>
                  <td>
                    <a href={person.sourceUrl}>FEC</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function CommitteeChart({ committees, asOf }: { committees: readonly ChartCommittee[]; asOf: string }) {
  const max = Math.max(1, ...committees.flatMap((row) => targetLines(row).map((line) => line.amount)));
  return (
    <figure className="chart">
      <figcaption className="chart-title">Outside groups that spent the most on these races</figcaption>
      <p className="hint">Spending by groups outside the campaigns.</p>
      <ul className="chart-legend" aria-hidden="true">
        <li>
          <span className="chart-swatch s-support" />
          Spent to support
        </li>
        <li>
          <span className="chart-swatch s-oppose" />
          Spent to oppose
        </li>
      </ul>
      <ShortList
        className="chart-rows"
        items={committees.map((row) => (
          <li key={row.committeeId} className="chart-row">
            <p className="chart-label">
              <a href={`/finance/committees/${row.committeeId}`}>{row.name}</a>
            </p>
            {targetLines(row).map((line) => (
              <div key={line.key} className="chart-target">
                <span className="chart-target-label">{line.label}</span>
                <div className="chart-bar-line chart-bar-line-wide">
                  <span className="chart-track" aria-hidden="true">
                    <span className={`chart-bar s-${line.direction}`} style={{ width: pct(line.amount, max) }} />
                  </span>
                  <span className="chart-value">{shortMoney(line.amount)}</span>
                </div>
              </div>
            ))}
          </li>
        ))}
      />
      {committees.length > 0 ? (
        <details className="chart-table">
          <summary>View as table</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Outside spending by group, table">
            <table>
              <caption className="sr-only">Outside spending by group</caption>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">Candidates</th>
                  <th scope="col">Spent to support</th>
                  <th scope="col">Spent to oppose</th>
                  <th scope="col">Total</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {committees.map((row) => (
                  <tr key={row.committeeId}>
                    <th scope="row">{row.name}</th>
                    <td>
                      {row.targets
                        .map((target) =>
                          [target.support > 0 ? `supported ${target.name}` : null, target.oppose > 0 ? `opposed ${target.name}` : null]
                            .filter(Boolean)
                            .join(", "),
                        )
                        .join("; ")}
                    </td>
                    <td>{FULL.format(row.support)}</td>
                    <td>{FULL.format(row.oppose)}</td>
                    <td>{FULL.format(row.total)}</td>
                    <td>{row.sourceUrl ? <a href={row.sourceUrl}>FEC</a> : "FEC"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
      <p className="chart-foot">Source: <a href="https://www.fec.gov/data/independent-expenditures/">FEC</a>{asOf}.</p>
    </figure>
  );
}

export function MoneyCharts({ data, showAll = false }: { data: MoneyChartData; showAll?: boolean }) {
  const selectId = useId();
  const races = data.races.filter((race) => race.people.length > 0);
  const [selectedRace, setRaceId] = useState(races[0]?.raceId ?? "");
  const [previousId, setPreviousId] = useState<string>();
  const raceId = races.some((race) => race.raceId === selectedRace) ? selectedRace : races[0]?.raceId;
  const shown = showAll ? races : races.filter((race) => race.raceId === raceId);
  if (!races.length && !data.committees.length) return null;
  return (
    <div className="money-charts">
      {showAll || !races.length ? null : (
        <label className="chart-picker" htmlFor={selectId}>
          Race
          <select id={selectId} value={raceId} onChange={(event) => {
            setPreviousId(raceId);
            setRaceId(event.target.value);
          }}>
            {races.map((race) => (
              <option key={race.raceId} value={race.raceId}>
                {race.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="chart-grid">
        {shown.length > 0 ? <div>
          {shown.map((race) => (
            <RaceChart key={race.raceId} race={race} showHeadline={showAll} previous={races.find((item) => item.raceId === previousId)} />
          ))}
          <p className="chart-foot">
            Source: <a href={data.candidateSource.url}>{data.candidateSource.name}</a>{data.candidateAsOf}.
          </p>
        </div> : null}
        {data.committees.length > 0 ? <CommitteeChart committees={data.committees} asOf={data.committeeAsOf} /> : null}
      </div>
    </div>
  );
}
