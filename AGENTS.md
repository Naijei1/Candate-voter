# THE VOTE

Read [DESIGN.md](DESIGN.md) before changing the interface. The shared theme and components live in `src/app/globals.css` and `src/components`.

- Cover Kentucky federal races only. Keep About out of the site and navigation.
- Preserve THE VOTE, crimson `#a8123e`, and the red/white flag wordmark. Keep copy brief and factual. Avoid disclaimers and placeholder content.
- Keep the autoplay hero film, its reduced-motion fallback, and “Or enter a ZIP code” under the map. Keep ZIP fields outside the hero. Omit pause buttons and other autonomous motion.
- Preserve “See official results”. Exclude live vote counts, ratings, flip projections and stat banners. Use verified data, quotes, photos and endorsements.
- Preserve the five mobile tabs (Home, My races, News Feed, Finances, Ask), Back/Next guide bar and compact statewide panel. Keep map labels inside districts, path-shaped focus, ordered keyboard access and dark selection without layout shift.
- Meet WCAG AA, keep visible focus and 44px controls, and check reflow down to 320px. Run axe on changed public views and respect reduced motion.
- Preserve cached performance, server components and security headers. Use next/font for self-hosted type. Avoid new client libraries, icon packs and external CSS or font requests.
- Keep design changes out of `.github/`, `infra/`, `amplify.yml`, authentication, API routes and ingestion. Preserve test meaning and identify intentional presentation-expectation changes. Leave Git writes to the operator.
