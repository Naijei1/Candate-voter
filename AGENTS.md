# THE VOTE

Read [DESIGN.md](DESIGN.md) before changing the interface. The shared theme lives in `src/app/globals.css`; v12 components live in `src/components/tv` (client pieces in `src/components/tv/client`) and view models in `src/lib/tv`.

- Cover Kentucky federal races only. Keep About out of the site and navigation. No sign-in on public pages; follows and the saved county stay on the device.
- Preserve THE VOTE, navy `#142B49` primary, crimson `#a8123e` accent and the red/white flag wordmark. Keep copy brief and factual (about 50 words on a phone’s first screen, 80 on desktop). Avoid disclaimers and placeholder content. Never invent data; say plainly when a record is missing.
- Keep the v12 line-drawing hero, its reduced-motion fallback and its off-screen pause. Omit pause buttons and other autonomous motion. No ZIP code entry anywhere: the flow is state map, then county.
- Preserve “See official results”. Exclude live vote counts, ratings, flip projections and election percentages or margins. Winners and result headlines stay behind the `display` flag in `data/ky-2026-general-winners.json` (off until certification); when on, show only “Won”.
- Preserve the five mobile tabs (Home, My races, News Feed, Finances, Ask). Keep map labels inside districts, path-shaped focus, ordered keyboard access and dark selection without layout shift.
- Compare shows one line per point with “More”, cut at a complete clause. Hide Endorsements and News when a candidate has none. Outside links use `ExtLink`. Source lines sit inside the box they cover.
- Meet WCAG AA, keep visible focus and 44px controls, and check reflow down to 320px. Run axe on changed public views and respect reduced motion.
- Preserve cached performance, server components and security headers. Use next/font for self-hosted type. Avoid new client libraries, icon packs and external CSS or font requests.
- Keep design changes out of `.github/`, `infra/`, `amplify.yml`, authentication, API routes and ingestion. Preserve test meaning and identify intentional presentation-expectation changes.

## Multi-state readiness

- Kentucky is the only enabled state. Do not add other states’ candidate data. `/states` and uncovered state pages show district outlines only, with no candidate data.
- State facts (district count, time zones, election day, results and filing links, map files) live in `src/lib/states.ts`. Read them from `stateConfig()` instead of writing new Kentucky constants. County and district shapes come from `stateMap()` in `src/lib/geo/state-maps.ts`.
- New race ids follow `{cycle}-senate-{ST}` and `{cycle}-house-{ST}-{DD}`, with `00` for at-large seats.
- Public URLs stay unprefixed (`/races/2026-senate-KY`, `/states/ky`). A data pipeline change needs its own plan; the phased plan is in `docs/us-ready-plan.md`.
