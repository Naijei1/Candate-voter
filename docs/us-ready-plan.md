# THE VOTE: US-ready plan

Done on `opus/us-ready`: `src/lib/states.ts` holds district count, time zones, election day, results and filing links, and map files. Kentucky is the only enabled state. Race ids, poll closing, results links, timestamp zone, county map path, sitemap and follow return paths read from it. A test pins the output to the old Kentucky values.

## Audit: where Kentucky is still fixed

| Area | Where | Kind |
| --- | --- | --- |
| Ballot, roster, finance seed | `src/lib/site/ky-ballot.ts`, `ky-finance.ts`, `ky-statewide.ts`, `ky-officeholders.ts`, `data/ky-*.json` | Data: one file family per state |
| Certified results and calendar | `data/ky-certified-results.json`, `data/ky-election-calendar.json`, `certified-results.ts` | Data, plus a loader keyed by state |
| News and mentions | `ky-news.ts`, `ky-candidate-mentions.ts`, `x-posts.ts` (Kentucky Lantern only) | Source list per state |
| Ask | `src/lib/chat/kentucky.ts`, `prompt.ts`, `scope.ts`, `intent.ts` (district `[1-6]`, “Kentucky” in prompts) | Prompt and intent per state |
| Map | `DistrictMap.tsx` (`postal === "KY"` label and fit tweaks, test-locked), `CountyMap.tsx` + `data/ky-counties.json`, `HomeMap.tsx` | Per-state label tweaks belong in the registry |
| ZIP lookup | `src/lib/geo/zip-districts.ts`, `address-district.ts` | Data already national in shape |
| Copy and SEO | `src/content/brand.ts`, `src/config/brand.ts`, `layout.tsx` OG alt, `manifest.ts` | Copy is test-locked; keep it until a second state ships |
| Alerts | `src/lib/alerts/events.ts` (`isKentuckyFederalRaceId`) | Swap for `isFederalRaceIdFor(state)` per subscription |
| API | `/api/v1`, `openapi-document.ts` (“Kentucky” in descriptions) | Add a `state` query param, defaulting to KY |
| Storage | DynamoDB keys are already national (`RACE#2026-house-KY-01`, `CYCLE#2026`) | No key change needed |
| Ingest | FEC Form 2 ingest is national; `scripts/seed-ky-ballot.ts` is Kentucky | Seed script per state |

## Phases

1. **Registry everywhere (S, 1–2 days).** Move the remaining constants into `states.ts`: district regex in chat intent, the Ask scope copy, the alert race check and the `DistrictMap` Kentucky tweaks (label compaction, fit). Update the two locked test expectations in `cd120.test.ts` on purpose. Still Kentucky only.
2. **Data by state (M, 1 week).** Rename `ky-*` loaders to `ballot(state)`, `results(state)`, `finance(state)` and load `data/{st}/…`. Keep the Kentucky files as the first entry. Make the seed script take `--state`. No URL change.
3. **URLs (M, 3–5 days).** Add `/[state]/…` routes (`/ky/races/2026-senate-KY`), with permanent redirects from today's paths so links and the PWA scope keep working. Canonicals, sitemap, return paths and the service worker scope read from the registry. Decide whether race ids keep the state suffix (they should: they match FEC and the table keys).
4. **Second state, hidden (M–L, 1–2 weeks per state).** Verified ballot, results links, district and county geometry, poll hours across zones, news sources and Ask notes. Ship behind `enabled: false` and an admin preview.
5. **Navigation and national entry (L, 1–2 weeks).** State switcher, a national landing page and the US map (`UsMap.tsx` exists). Per-state manifests or a neutral one, OG images per state, copy that drops “Kentucky” only where a state is not known.

## Risks

- Tests lock several Kentucky strings and source patterns. Change them with the code, and call each one out as an intended expectation change.
- Poll closing depends on every zone in a state. Several states span two zones, and Alaska and Hawaii need their own.
- At-large seats use `00`. The map and race ids already follow that.
