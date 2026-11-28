# THE VOTE

Read [DESIGN.md](DESIGN.md) before changing the interface. The shared theme lives in `src/app/globals.css`; components live in `src/components/tv` (client pieces in `src/components/tv/client`) and view models in `src/lib/tv`.

- Cover Kentucky federal races only. Keep About out of the site and navigation. No sign-in on public pages; follows and the saved county stay on the device.
- Preserve THE VOTE, navy `#142B49` primary, crimson `#a8123e` accent and the red/white flag wordmark. Keep copy brief and factual (about 50 words on a phone’s first screen, 80 on desktop). Avoid disclaimers and placeholder content. Never invent data; say plainly when a record is missing.
- Keep the line-drawing hero, its reduced-motion fallback and its off-screen pause. Omit pause buttons and other autonomous motion. No ZIP code entry anywhere: the flow is county, then My races, then race, then candidate, compare or money.
- Preserve “See official results”. Exclude live vote counts, ratings, flip projections and election percentages or margins. Winners and result headlines sit behind the `display` flag in `data/ky-2026-general-winners.json` (on since Nov 28, 2026, with owner approval); show only “Won”.
- Use one set of section names everywhere, from `src/lib/tv/nav.ts`: My races, News, Campaign money, Search. The five mobile tabs are Home plus those four. “Where to vote” links to the state’s official voter lookup (`voterInfo` in `src/lib/states.ts`); keep no polling-place data of our own. No alerts bell, no Polls or Ballot measures in navigation. Keep map labels inside districts, path-shaped focus, ordered keyboard access and dark selection without layout shift.
- Plain words: full party names, “$12.5 million”, FEC, PAC and SOS spelled out on first use, about a 6th-grade reading level. Compare shows full sentences, stacked on phones. Sources sit under a “Sources” toggle. Hide Endorsements and News when a candidate has none. Outside links use `ExtLink`. Source lines sit inside the box they cover.
- Meet WCAG AA, keep visible focus and 44px controls, and check reflow down to 320px. Run axe on changed public views and respect reduced motion.
- Preserve cached performance, server components and security headers. Use next/font for self-hosted type. Avoid new client libraries, icon packs and external CSS or font requests.
- Keep design changes out of `.github/`, `infra/`, `amplify.yml`, authentication, API routes and ingestion. Preserve test meaning and identify intentional presentation-expectation changes.

## Multi-state readiness

- Kentucky is the only enabled state. Do not add other states’ candidate data. `/states` and uncovered state pages show district outlines only, with no candidate data.
- State facts (district count, time zones, election day, results and filing links, map files) live in `src/lib/states.ts`. Read them from `stateConfig()` instead of writing new Kentucky constants. County and district shapes come from `stateMap()` in `src/lib/geo/state-maps.ts`.
- New race ids follow `{cycle}-senate-{ST}` and `{cycle}-house-{ST}-{DD}`, with `00` for at-large seats.
- Public URLs stay unprefixed (`/races/2026-senate-KY`, `/states/ky`). A data pipeline change needs its own plan; the phased plan is in `docs/us-ready-plan.md`.
