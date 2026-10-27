import Link from "next/link";
import { stateName } from "@/lib/data/states";
import { mapHomeHref, type MapContext } from "@/lib/landing/state-query";

/**
 * Sticky way back from a race or candidate.
 * Back to map keeps year, state, and zip when this page was opened with them,
 * so a ZIP visit returns to that state view. The state sheet's own control
 * still returns to the country map.
 */
export function BackChrome({
  state,
  year,
  zip = null,
  district = false,
  raceHref = null,
  raceLabel = null,
}: {
  state: string | null;
  year?: number | string | null;
  /** ZIP from the page query. Kept only together with `state`. */
  zip?: string | null;
  /** House contest: also link to the state overview where Your races lives. */
  district?: boolean;
  raceHref?: string | null;
  raceLabel?: string | null;
}) {
  const context: MapContext = { year, state, zip };
  const mapHref = mapHomeHref(context);
  const stateHref = state ? mapHomeHref(context) : mapHref;
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
