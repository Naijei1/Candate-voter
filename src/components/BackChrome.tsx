import Link from "next/link";
import { stateName } from "@/lib/data/states";

/**
 * Sticky way back from a race or candidate.
 * The state overview keeps its own in-page control so the map URL stays a pushState.
 */
export function BackChrome({
  state,
  year,
  district = false,
  raceHref = null,
  raceLabel = null,
}: {
  state: string | null;
  year?: number | null;
  /** House contest: also link to the state overview where Your races lives. */
  district?: boolean;
  raceHref?: string | null;
  raceLabel?: string | null;
}) {
  const yearPart = year != null ? `year=${encodeURIComponent(String(year))}` : "";
  const mapHref = yearPart ? `/?${yearPart}` : "/";
  const stateHref = state
    ? `/?${[yearPart, `state=${encodeURIComponent(state)}`].filter(Boolean).join("&")}`
    : mapHref;
  const place = state ? stateName(state) : null;

  return (
    <nav className="back-chrome" aria-label="Back" data-testid="back-chrome">
      <Link href={mapHref} className="back-link" data-testid="back-to-map">
        <span aria-hidden="true">← </span>
        Back to map
      </Link>
      {place ? (
        <Link href={stateHref} className="back-place" data-testid="back-state">
          {place}
        </Link>
      ) : null}
      {district && state ? (
        <Link
          href={`${stateHref}#your-races`}
          className="back-link back-races"
          data-testid="back-to-races"
        >
          Your races
        </Link>
      ) : null}
      {raceHref ? (
        <Link href={raceHref} className="back-link back-race" data-testid="back-to-race">
          <span className="back-race-short">This race</span>
          {raceLabel ? <span className="sr-only">, {raceLabel}</span> : null}
        </Link>
      ) : null}
    </nav>
  );
}
