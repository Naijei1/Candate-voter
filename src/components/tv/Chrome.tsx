import Link from "next/link";
import { dayLabel } from "@/lib/format";
import { stateConfig, statePath } from "@/lib/states";
import { HOME_NAV, NAV } from "@/lib/tv/nav";
import { siteIndex } from "@/lib/tv/site-index";
import { CommandPalette, SearchButton } from "./client/CommandPalette";
import { MenuSheet } from "./client/MenuSheet";
import { PrimaryNav } from "./client/PrimaryNav";
import { ReportButton, ReportDialog } from "./client/Report";
import { ThemeToggle } from "./client/ThemeToggle";
import { Toast } from "./client/Toast";
import { YoursLink } from "./client/Yours";
import { Icon } from "./Icon";
import { WhereToVote } from "./Status";

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

export function SiteHeader() {
  const state = stateConfig();
  return (
    <>
      <header className="hdr">
        <div className="wrap">
          <Brand />
          <PrimaryNav />
          <div className="hdr-end">
            <WhereToVote className="wtv hdr-wtv" />
            <SearchButton />
            <ThemeToggle className="thm only-d" />
            <MenuSheet>
              <nav className="sh-b mnav" aria-label="All sections">
                <Link className="top" href={HOME_NAV.href}>
                  <Icon name={HOME_NAV.icon} size="sm" />
                  {HOME_NAV.label}
                </Link>
                {NAV.map((item) =>
                  item.href === "/ballot" ? (
                    <YoursLink key={item.href} className="top">
                      <Icon name={item.icon} size="sm" />
                      {item.label}
                    </YoursLink>
                  ) : (
                    <Link key={item.href} className="top" href={item.href}>
                      <Icon name={item.icon} size="sm" />
                      {item.label}
                    </Link>
                  ),
                )}
                <WhereToVote className="top wtv" />
                <h3>More</h3>
                <Link href={statePath(state)}>All {state.name} races</Link>
                <Link href="/officeholders">Who holds office now</Link>
                <Link href="/sources">Where our facts come from</Link>
                <ThemeToggle className="thm mthm" />
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
            <p>{state.name}’s U.S. Senate and House races. Every fact links to its source.</p>
          </div>
          <ul className="f-links">
            <li>
              <WhereToVote className="f-link" />
            </li>
            <li>
              <Link href="/sources">Sources</Link>
            </li>
            <li>
              <ReportButton className="f-link">Report an error</ReportButton>
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
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
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
