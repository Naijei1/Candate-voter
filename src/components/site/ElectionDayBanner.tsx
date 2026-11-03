import { KY_BALLOT_CHECKED, KY_POLLS, calendarDay } from "@/lib/site/ky-ballot";

export function ElectionDayBanner() {
  return (
    <aside className="election-banner" aria-label="Election Day">
      <p>
        <strong>Election Day: Nov 3, 2026.</strong> Kentucky polls are open {KY_POLLS.hours}. If you are in line at
        6:00 p.m., you can still vote.
      </p>
      <p>
        <a className="btn btn-navy" href={KY_POLLS.lookupUrl}>
          Find your polling place
        </a>
      </p>
      <p className="hint">
        Hours and the lookup link are from the Kentucky State Board of Elections, checked {calendarDay(KY_BALLOT_CHECKED)}.
        Results are not linked here yet.
      </p>
    </aside>
  );
}
