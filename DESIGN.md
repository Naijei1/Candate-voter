# THE VOTE

THE VOTE is a guide to Kentucky’s U.S. Senate and House races. The v12 design (approved mockups in the `r2/site` archive) is the visual and UX spec. Lead with the race, person, filing or source the reader came for. Say plainly when a record is missing.

## Color

Use the roles in `src/app/globals.css`; never hard-code a hex in a component. Navy `#142B49` (`--navy-800`) is the primary: buttons, the selected segment, the selected district and county, current navigation. Crimson `#a8123e` (`--red-600`) is the accent: the flag and small emphasis. Light pages are white with `--band` `#F6F8FB` sections; ink is `#161C29` and muted text `#525E73`. Dark mode (`[data-theme="dark"]`, toggled in the header and stored as `tv-theme`) uses `#0A1628` with `#112342` surfaces, ink `#EAF0F8`, muted `#B7C4D8`, links `#A9C5F2` and accent text `#F0728F`.

Party tags are muted fills with white text and always carry the party name: Republican `#A03A2B` (kept 20° of hue away from the crimson), Democratic `#2A5495`, Independent and write-in slate. Never colour a map by party. Maps use navy tints (`--map-0`, `--map-1`), `--map-hover` on hover or focus and `--map-on` for the selection.

Tailwind’s `@theme` tokens (`--color-navy`, `--color-ink`, …) point at these roles so admin and account views follow the brand and dark mode.

## Type and space

Source Serif 4 sets display and section titles; Public Sans sets reading text at 18px. Both load through `next/font` (self-hosted, no external requests). Scale 14 / 18 / 22 / 28 / 35 / 44 / 55. Space 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Radius 6 / 10 / 16 / pill. One shadow token (`--shadow`) and one for popovers (`--shadow-pop`). Money and dates use tabular numerals (`.num`).

Word budget: about 50 words on a phone’s first screen and about 80 on desktop. No disclaimers.

## Chrome

The header holds THE VOTE wordmark with the red/white flag, the primary nav (Find my races, Candidates, News and Updates, Polls and Analysis, Campaign Finance), search (command palette), alerts and the theme toggle. Phones get a menu sheet and the five-tab bar: Home, My races, News Feed, Finances, Ask. The tab bar hides while the on-screen keyboard is open. The footer is the dark navy band with a white focus ring. An offline notice appears at the top of `main` when the connection drops.

## Home

The hero is a CSS line drawing of the country with the covered state lit (`hero-b`). It pauses off screen and when the tab is hidden, and is still under reduced motion. There is no pause button and no ZIP field. Then: the Senate matchup with a Compare link, Featured stories, Explore by state (tile map and finder), and sources.

## Finding your races

The flow is state map, then county. `/ballot` is a county combobox with quick picks and a county map. A county in more than one district asks which district is on the voter card, links the county clerk and offers “Show both”. The choice is saved on the device (`tv-place`) and drives “Your races” everywhere. No address or ZIP code is ever asked for.

## State pages

`/states` lists every state; `/states/{st}` serves a covered state (Statewide, Congressional and County views, key dates with “See official results”) or an uncovered state (district outlines and “Awaiting verified filings”). The scope nav (National, States, Congress, Local) appears on these pages and on officeholders.

## Race, candidate and compare

- Race pages lead with the November candidate cards (photo or initials, party tag, one line from records, Follow), then a Compare button and tabs: Issues, Statements, Voting record, Polls, Campaign finance, Updates. An Ask panel sits beside on desktop and in a sheet on phones.
- Candidate pages: verified facts, positions, record, money summary, endorsements and news. Endorsements and News are hidden when there are none. Phone jump links use the section headings’ exact words.
- Compare shows one line per point with “More”. Every cut ends at a complete clause (`src/lib/tv/short-line.ts`); the stored text is never rewritten.
- Each source line sits inside the box with the statements it covers.

## Money

One stacked bar per candidate, split into Individuals, PACs and other committees, Self-funding, and “Other (transfers, loans, refunds)”. Segments are ink patterns (solid, hatch, dots, line) with a legend, so they work without colour; the legend stacks on phones. Outside spending reads “Outside groups for/against <name>”. Figures come from `data/ky-fec-breakdown.json`, refreshed from the FEC API by `npm run refresh:fec-breakdown`.

## Results

Winners and result-revealing headlines stay hidden behind one flag: `display` in `data/ky-2026-general-winners.json`. When it is on, pages show only a “Won” label, never numbers, percentages or margins.

## Accessibility

WCAG AA in both themes. A 3px focus ring (`--focus`) 2px off the element; white on the footer and hero. District maps draw focus on the path and are ordered links; county maps pair with a select. Controls are at least 44px. Outside links open in a new tab with `rel="noopener"` and a visually hidden “(opens in new tab)” (`ExtLink`). Reduced motion removes the hero drawing and transitions. Check reflow at 320px.
