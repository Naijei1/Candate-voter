import Link from "next/link";
import { dayLabel } from "@/lib/format";
import { stateConfig } from "@/lib/states";
import { lastName } from "@/lib/tv/party";
import { allRaces, defaultPair } from "@/lib/tv/people";
import { siteIndex } from "@/lib/tv/site-index";
import { AlertsButton } from "./client/Alerts";
import { CommandPalette, SearchButton } from "./client/CommandPalette";
import { MenuSheet } from "./client/MenuSheet";
import { PrimaryNav, type NavItem } from "./client/PrimaryNav";
import { ReportButton, ReportDialog } from "./client/Report";
import { ThemeToggle } from "./client/ThemeToggle";
import { Toast } from "./client/Toast";
import { YoursLink } from "./client/Yours";

/** Last date the stored records were checked. */
export const DATA_CHECKED = "2026-11-22";

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="THE VOTE, home">
      <span className="brand-flag" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-name" translate="no">
        THE VOTE
      </span>
    </Link>
  );
}

function menus(): { candidates: NavItem[]; polls: NavItem[] } {
  const state = stateConfig();
  const races = allRaces(state);
  const senate = races.find((race) => race.office === "senate");
  const pair = senate ? defaultPair(senate) : null;
  const house = races.filter((race) => race.office === "house").length;
  const candidates: NavItem[] = [
    { href: `/states/${state.slug}`, title: `${state.name} races`, sub: `${senate ? 1 : 0} Senate race, ${house} House races` },
  ];
  if (senate) candidates.push({ href: `/races/${senate.raceId}`, title: senate.title, sub: `${senate.people.length} candidates` });
  if (senate && pair) {
    candidates.push({
      href: `/races/${senate.raceId}/compare?a=${pair[0].id}&b=${pair[1].id}`,
      title: `Compare ${lastName(pair[0].name)} and ${lastName(pair[1].name)}`,
      sub: "Side by side",
    });
  }
  candidates.push(
    { href: "/officeholders", title: "Officeholders", sub: "Who holds office now", rule: true },
    { href: "/states", title: "Explore by state", sub: "All 50 states and D.C." },
  );
  const polls: NavItem[] = [
    { href: "/polls", title: "Polls", sub: "No qualifying polls yet" },
    { href: "/measures", title: "Ballot measures", sub: "Example layout" },
  ];
  return { candidates, polls };
}

export function SiteHeader() {
  const { candidates, polls } = menus();
  return (
    <>
      <header className="hdr">
        <div className="wrap">
          <Brand />
          <PrimaryNav candidates={candidates} polls={polls} />
          <div className="hdr-end">
            <SearchButton />
            <AlertsButton />
            <ThemeToggle />
            <MenuSheet>
              <nav className="sh-b mnav" aria-label="All sections">
                <YoursLink className="top">Find my races</YoursLink>
                <h3>Candidates</h3>
                {candidates.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.title}
                  </Link>
                ))}
                <Link className="top" href="/news">
                  News and Updates
                </Link>
                <h3>Polls and Analysis</h3>
                {polls.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.title}
                  </Link>
                ))}
                <Link className="top" href="/finance">
                  Campaign Finance
                </Link>
                <h3>About the data</h3>
                <Link href="/sources">Sources and methodology</Link>
                <Link href="/sources#coverage">Coverage status</Link>
              </nav>
            </MenuSheet>
          </div>
        </div>
      </header>
      <CommandPalette index={siteIndex()} />
    </>
  );
}

export function SiteFooter() {
  const state = stateConfig();
  return (
    <>
      <footer className="ftr">
        <div className="wrap">
          <div className="f-brand">
            <Brand />
            <p>Your elections, all in one place. {state.name} is covered now. Every fact links to its source.</p>
          </div>
          <div>
            <h2>Explore</h2>
            <ul>
              <li>
                <YoursLink>Find my races</YoursLink>
              </li>
              <li>
                <Link href={`/states/${state.slug}`}>{state.name}</Link>
              </li>
              <li>
                <Link href="/states">Explore by state</Link>
              </li>
              <li>
                <Link href="/officeholders">Officeholders</Link>
              </li>
              <li>
                <Link href="/news">News and Updates</Link>
              </li>
              <li>
                <Link href="/finance">Campaign Finance</Link>
              </li>
              <li>
                <Link href="/polls">Polls and Analysis</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Trust</h2>
            <ul>
              <li>
                <Link href="/sources">Sources and methodology</Link>
              </li>
              <li>
                <Link href="/sources#coverage">Coverage status</Link>
              </li>
              <li>
                <ReportButton className="f-link">Feedback and corrections</ReportButton>
              </li>
              <li>
                <Link href="/sources#independence">Independence and affiliations</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Site</h2>
            <ul>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/accessibility">Accessibility</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
            </ul>
          </div>
          <p className="f-base">
            THE VOTE, {state.cycle} elections. Data last checked {dayLabel(DATA_CHECKED)}.
          </p>
        </div>
      </footer>
      <ReportDialog />
      <Toast />
    </>
  );
}
