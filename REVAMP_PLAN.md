# Candate revamp review

## Still needs Naijei (November 3, 2026)

These stay off the public pages until he supplies them. Do not invent the text or the photos.

- Founder biography, mission statement, and founder photograph.
- Ownership, funding, affiliations, and an independence statement beyond “this site does not endorse candidates.”
- Editorial standards and a corrections policy.
- A public contact method.
- Approved privacy, terms, and accessibility statements.
- Logo and homepage photograph.
- State, county, city, judicial, and school-board candidate lists. elect.ky.gov was not readable (HTTP 403).
- Certified ballot-question text.
- A news source feed.
- A polling vendor, inclusion rules, and any speech or debate archive.
- Email delivery (no SES setup).

Public pages now say what a visitor can do today and hide empty scaffolding. Internal status labels stay on `/admin/features`.


Review only. This document does not change the product UI, the data plane, or AWS.

Decision requested: approve **approach B** (strip the map-first site and rebuild the public shell in this repo, keeping the federal filing pipeline), or reject it before any UI work starts.

Reviewed against Luke Wyatt’s product brief of October 30, 2026, and the tree at `587a597` (`main`). Production today is the Amplify app at [voter.naijei.com](https://voter.naijei.com). Account `402275401617`, region `us-east-1`.

## Status after Phase 1.5

Phase 1 (homepage and Kentucky journey) and the copy pass in PR #45 are on `main`. This section is the current inventory. Labels are the brief’s four: **working**, **demo**, **awaiting content**, **planned**. The review below is the original decision record.

Approach B is in progress. Phase 1 and 1.5 did not change CloudFormation. Phase 2 adds Cognito email sign-in, table `candate-voter-users`, and a least-privilege Amplify policy in `infra/template.yaml`. Alert email stays planned. Google sign-in is not included.

### Phase scope and cost

| Phase | What it is | AWS change | Cost note |
| --- | --- | --- | --- |
| 1 | Public shell, Kentucky federal journey, labeled demos | None | Hosting only. Done. |
| 1.5 | Homepage trust block, 120th district map, Ask panel placement | None | No new services. |
| 2 | Accounts and saved follows | Cognito plus table `candate-voter-users` | Cognito free tier for a pilot list. No email yet. |
| 3 | FEC fundraising totals for stored Kentucky federal ids | Second ingest cursor and Lambda | OpenFEC stays $0. Extra Lambda time stays small. |

Do not budget a polling vendor, a licensed ballot file, or social APIs until access is confirmed. Those would be the first real data invoices.

### Source and coverage inventory

| Need | Label | Source | Access | Cost | Fallback |
| --- | --- | --- | --- | --- | --- |
| Federal filer name, party, FEC id, filing PDF | working | OpenFEC `GET /v1/efile/form2/` | `FEC_API_KEY` on the ingest Lambda. Free key, 1,000 calls/hour. | $0 API | Show the ingest watermark error. Do not insert sample names. |
| Even-year House and Senate contest list | working | `expected-races.ts` plus stored rows | In-process | $0 | Empty contest stays empty. |
| ZIP to congressional district | working | Census TIGERweb 120th districts, January 1, 2026 | Public HTTP, no key, 7 second budget | $0 | Failure message, then the state list. Not a full ballot. |
| District shapes | working | Same 120th layer, saved in `public/geo/cd120` | Static files generalized from that layer | $0 | Map and ZIP stay on one Congress. |
| Ballot qualification | planned | Kentucky State Board of Elections | Not connected | Staff time | Badge stays “not verified.” |
| State, county, city, judicial, school | planned | Kentucky election offices | Not connected | Unknown | Category filter says not covered. |
| Ballot measure text | demo | Sample layout only | None | $0 | Page says it is not a certified 2026 question. |
| Photos, biography, issues, quotes | awaiting content | Approved files and cited records | None | Staff time | Placeholder or omitted. Not invented. |
| Founder photo, mission, affiliations | awaiting content | Luke Wyatt | None | $0 | “Awaiting” badge. No biography written here. |
| Voting record | planned | Congress.gov when service is known | Not connected | $0 API if used later | Omitted unless we know the person served. |
| Polls | planned | No vendor | None | Unscoped | “No qualifying polls available.” |
| Fundraising and PACs | working for totals | OpenFEC candidate totals and Schedule E aggregates | `FEC_API_KEY` on the totals Lambda | $0 API | Direct committee money and outside spending stay in separate figures and are not added. Itemized Schedule A stays out. |
| News | demo | Sample cards | None | Unknown | Sample badge. No fake news URL. |
| Follow and alerts | working to save; planned to send | Cognito plus `candate-voter-users` | Amplify compute role | Cognito free tier. No SES. | Preferences save after sign-in. Email delivery stays planned. |
| Ask panel examples | demo | Example answers. Real FEC filing link when a row has one | No model call | $0 | Otherwise the source is marked Sample. |
| Filings assistant (`/chat`) | working when enabled | Stored Form 2 rows via Bedrock | Compute role. Off until `CANDATE_CHAT_ENABLED=true` | Per token if turned on | Refuses when the table has no fact. |

### Still awaiting access or content

- Founder photograph, biography, and mission statement — awaiting content.
- Ownership, funding, affiliations, privacy, and terms — awaiting content.
- Public contact address — awaiting content.
- Campaign photos and campaign websites — awaiting content. A filing link is labeled “FEC filing,” not “Website.”
- State and local contest feeds — planned.
- Ballot qualification — planned.
- Polling vendor — planned.
- Itemized donors and outside spending — planned. Phase 3 may add FEC totals only.
- Email and push delivery — planned. The alert screen is a demo.

## Recommendation

**Approach B. Aggressive strip-and-rebuild in this repository.**

Build a new public site (homepage, navigation, navy/red/white system, one Kentucky journey, labeled prototypes) on a branch. Keep the federal data plane already running here: the DynamoDB table, Form 2 ingest, repository, Census ZIP lookup, district geography, read API, and the grounded filings assistant. Swap `/` only when that journey meets the brief’s acceptance checks. Leave [voter.naijei.com](https://voter.naijei.com) on `main` until that cutover.

This matches the brief’s build order: design and one end-to-end race first, verified data for a defined pilot second, accounts and alerts after the journey is real, wider coverage only after sources are named.

**Approach A is the wrong first move.** A greenfield rewrite would rebuild about 15k lines of tested filing, ingest, geography, and API code before a visitor can see a homepage. The brief’s first delivery is a designed journey plus an honest inventory, and the repo already has the only verified slice that journey can use: 2026 federal contests, including Kentucky’s Class II Senate seat and six House districts.

**A new repo or Amplify Gen 2 is the wrong container.** Hosting, the domain, the table `candate-voter`, and the scheduled ingest should stay. The README already records that Gen 2 (`ampx`, AppSync, `amplify/backend.ts`) is a different architecture from the working Amplify Hosting SSR app (`amplify.yml`, platform `WEB_COMPUTE`). The pilot does not need a GraphQL backend.

**Restyling the current home in place is the higher-risk path inside this repo.** `/` is not a page with a map on it. `src/components/AppFrame.tsx` renders a full-bleed map frame only on `/`. `src/app/globals.css` locks `body` to `100dvh` with `overflow: hidden` and then spends most of its 1,512 lines on map chrome, glass, sheets, and a dark theme. `src/components/Landing.tsx` (932 lines) is the state machine for that map. A large share of `test/landing.test.ts`, `test/ui-polish.test.ts`, `test/mobile-shell.test.ts`, `test/map-select.test.ts`, `test/gesture.test.ts`, and `test/chat-ui.test.ts` locks that behavior. New sections would fight the viewport and the tests on every page.

## What the first delivery has to be

From the brief, the next developer delivery is a pilot, not the nationwide product:

1. Homepage and navigation in navy `#142B49`, white `#FFFFFF`, pale gray `#F4F6F8`, red `#B32635` used sparingly, body text `#202833`, sans-serif, about 18px body. Desktop and mobile.
2. One complete Kentucky journey: state, election year and date, race category, race, candidate cards, one profile, a comparison, and a ballot-measure example. Demonstration content labeled.
3. An AI panel with source-linked example answers, a no-evidence answer, and a correction control. A visual prototype must be distinguishable from working retrieval.
4. Follow controls and alert preferences, with an honest demonstration of what works, including empty, loading, error, and no-results states.
5. A source and coverage inventory, a phased implementation description, recurring cost notes, and a list of features waiting on access or verification.
6. Framework pages that can be filled later: editable branding (or a clear stand-in), ZIP search, news preferences, a campaign-finance tab, and one PAC profile. Same visual system. Sample records labeled.

The finished pilot, later, lets a first-time visitor find a race, compare candidates, inspect sources, and manage alerts without help. This review plans that pilot. It does not plan nationwide offices, a speech corpus, or push notifications.

## Inventory of the current app

Stack: Next.js 15.5 App Router, React 19, TypeScript, Tailwind CSS 4, npm. Node 22 on Amplify (`.nvmrc`, `amplify.yml`). No Amplify Gen 2 backend. No Cognito, no user table, no CMS, no email, no push.

Rough size, excluding `node_modules` and GeoJSON: about 28k lines of TypeScript, TSX, and CSS under `src/`, `test/`, `workers/`, `scripts/`, and `infra/`. `public/geo/cd119/` is 51 static district files, about 416 KB.

### Routes that exist

| Path | What it is |
| --- | --- |
| `/` | The product. Full-bleed U.S. map. `?state=KY` opens Kentucky. `?state=KY&zip=40502` pins “Your races.” `src/app/page.tsx` loads the race index and renders `Landing`. |
| `/races/[raceId]` | Office title plus an alphabetical list of stored filers. Permanent id such as `2026-senate-KY` or `2026-house-KY-01`. |
| `/candidates/[candidateId]` | Name, party code, and Form 2 filing list. |
| `/chat` | Full-page Ask. |
| `/agent` | Public docs for the read API and the ingest watermark. |
| `/openapi.yaml`, `/llms.txt` | Machine-readable API index. |
| `/api/v1/races`, `/api/v1/races/[raceId]`, `/api/v1/candidates/[candidateId]`, `/api/v1/candidates/[candidateId]/filings`, `/api/v1/freshness`, `/api/v1/lookup/zip` | Read-only JSON. Bearer or `X-Api-Key` via `CANDATE_API_KEY` (`src/lib/api/auth.ts`). |
| `POST /api/chat` | Same-origin filings assistant. No API key. Buffered JSON because Amplify compute does not stream. Bedrock Converse when `CANDATE_CHAT_ENABLED=true`. |

There is no `/about`, `/news`, `/polls`, `/finance`, `/account`, `/sign-in`, measure route, officeholder directory, or Explore-by-State page separate from the map.

### UI and visual system

Header (`src/components/SiteHeader.tsx`): wordmark, year menu, Ask. Footer (`src/components/SiteFooter.tsx`): a single “Agent API” link, and only off the homepage. The homepage has no footer.

Color tokens in `src/app/globals.css` are teal accent `#0f766e` on paper `#f4f7f8`, with a `prefers-color-scheme: dark` theme. Party text uses `--party-dem` and `--party-rep`. The brief’s navy, red, and white system is not present. Dark mode is not in the brief and would fight a fixed civic palette.

Map pieces: `src/components/UsMap.tsx` (state shapes from `src/lib/geo/us-states.ts`), `src/components/DistrictMap.tsx` (joins `public/geo/cd119/{ST}.json` to race ids), `src/components/MapGesture.tsx`, `src/lib/map/gesture.ts`, `src/components/useMobileSheet.ts`, `src/components/ZipLookup.tsx`, `src/components/StateScoreboard.tsx`.

Copy in `src/lib/copy.ts` is careful: a Form 2 is not the ballot, federal offices only, split ZIPs are explained, empty districts are empty. That honesty is worth keeping. The information architecture around it is the map.

### Data model

`src/lib/types.ts` has four stored shapes: `Race`, `Candidate`, `Filing` (`formType: "F2"` only), `IngestWatermark`.

Offices are `president | senate | house`. There is no election-stage field (primary, general, special, runoff), no ballot measure, no officeholder, no person identity separate from an FEC candidate id, no photo, incumbency, campaign site, issue, quote, vote, poll, receipt, or PAC.

Keys are documented in `src/lib/data/keys.ts` and must stay in lockstep with `infra/template.yaml`:

| Access | Key |
| --- | --- |
| Race | `pk = RACE#<raceId>`, `sk = META` |
| Races in a cycle | `gsi1pk = CYCLE#<year>` |
| Candidate | `pk = CAND#<candidateId>`, `sk = META` |
| Candidates in a race | `gsi1pk = RACE#<raceId>` |
| Filings | `pk = CAND#<candidateId>`, `sk begins_with FILING#` |
| Cursor | `pk = INGEST#F2`, `sk = WATERMARK` |

Race ids: `2028-president`, `2026-senate-KY`, `2026-house-KY-01`. At-large House is district `00`. Kentucky has six seats (`src/lib/data/at-large.ts`). `src/lib/data/expected-races.ts` synthesizes empty stubs for every even-year House district and for a Senate seat when `senateSeatUp` is true. Those stubs are not written to DynamoDB. Kentucky is Senate Class II, which is on the ballot in 2026 (`src/lib/data/senate-classes.ts`). 2026 is not a presidential general-election year (`src/lib/data/calendar.ts`).

`src/lib/data/repository.ts` is the DynamoDB adapter (GetItem, Query, UpdateItem). `src/lib/data/memory-repository.ts` is the dry-run double. Reads dedupe same-name filers on a race (`src/lib/data/view.ts`, `person-filings.ts`, `dedupe.ts`). `scripts/consolidate-presidential.ts` can mark duplicates superseded. The app role cannot `DeleteItem`. Street address, city, and ZIP from the filing are intentionally not stored (`src/lib/fec/map-form2.ts`).

`src/lib/placeholders.ts` is a three-row fixture. Production pages do not import it. It is not a pilot content pack.

### Auth

There are no user accounts. `src/lib/api/auth.ts` is a constant-time compare for the machine read API. HTML pages and `POST /api/chat` are public. Nothing can follow a race, save a ZIP, or send an alert.

### Workers, scripts, ingest

| Piece | Role |
| --- | --- |
| `workers/fec-ingest/app.ts` | Lambda entry. Re-exports `src/lib/ingest/handler.ts`. |
| `src/lib/ingest/run.ts`, `watermark.ts` | Page the OpenFEC electronic Form 2 feed, upsert, advance an inclusive cursor. |
| `src/lib/fec/client.ts`, `types.ts`, `map-form2.ts` | HTTP client, retry, mapping. Offices H, S, and P only. |
| `scripts/ingest.ts` | Same run, local or dry-run. |
| `scripts/consolidate-presidential.ts` | Optional duplicate collapse. Dry-run unless `--apply`. |
| `scripts/write-amplify-server-env.mjs` | Copies selected Amplify env vars into `.env.production` because WEB_COMPUTE does not pass console env into the Next server. Does not copy `FEC_API_KEY`. |

Schedule: EventBridge `rate(6 hours)` on `candate-voter-fec-ingest` (Node 22, arm64, 512 MB, 15 minute timeout). The electronic feed is statements of candidacy. It is not ballot qualification, not Form 3 fundraising, and not a candidate master.

### AWS and Amplify

`infra/template.yaml` is SAM stack `candate-voter-data` (`infra/samconfig.toml`). It creates:

- DynamoDB `candate-voter`, on-demand, point-in-time recovery, retain on delete, GSI `gsi1` projection ALL.
- The ingest Lambda, its log group (30 days), and the schedule.
- IAM limited to `dynamodb:GetItem`, `UpdateItem`, and `Query` on the table and `gsi1`.

It does not create Amplify, Cognito, S3, SES, SNS, or Bedrock. Amplify Hosting is console-managed. The SSR compute role is expected to have `GetItem` and `Query` only. Bedrock `Converse` / `InvokeModel` is a console IAM change described in the README, not in the template. Chat stays off until `CANDATE_CHAT_ENABLED=true`.

`next.config.ts` stays on SSR (`output: "export"` is forbidden). Optional `NEXT_PUBLIC_BASE_PATH` exists for a future `/voter` mount. Default is the domain root, which is correct for `voter.naijei.com`.

### Tests worth knowing about

`npm test` is `node --import tsx --test test/*.ts`.

Keep green across the revamp because they protect the data plane: `ingest`, `fec-client`, `map-form2`, `watermark`, `cursor-upsert`, `cycles`, `expected-races`, `records`, `read-index`, `person-filings`, `expressions`, `contract`, `api`, `lookup`, `cd119`, `table-name`, `format`.

Rewrite or quarantine when `/` and the Ask chrome change: `landing`, `ui-polish`, `ui-pack`, `mobile-shell`, `map-select`, `gesture`, `chat-ui`, and the UI-facing parts of `clarity` and `chat`. `test/chat.test.ts` (about 1,900 lines) is still valuable if `POST /api/chat` remains the filings assistant.

## Gap against the first delivery

| Brief requirement | Current reality |
| --- | --- |
| Homepage that explains the product, with photography, “how it works,” featured items, founder, and the map lower on the page | `/` is the map. No headline, steps, photography, featured block, or founder. |
| Header: Find My Races, Candidates, News and Updates, Polls and Analysis, Campaign Finance, About Us, Sign In. Saved races and alerts inside the account menu | Header is wordmark, year, Ask. |
| Footer: contact, corrections, methodology, accessibility, privacy, terms, independence | Footer is “Agent API,” and the homepage has none. |
| Navy / red / white, 18px body, equal candidate cards, party as text, no brand color that picks a side | Teal accent, dark mode, party-colored text utilities. |
| Kentucky → year and date → category (federal through school board) → race → comparison | Map → federal list → filing list. Categories below federal do not exist. Kentucky 2026 federal stubs do exist (`2026-senate-KY`, `2026-house-KY-01` through `06`). |
| Primary, general, special, runoff called out. Location kept across pages | Copy says primaries vary. Records have no stage. Year, state, and ZIP survive as query params (`src/lib/landing/state-query.ts`). |
| Candidate cards: photo, name, party, incumbency, filing or ballot status, campaign site. Comparison tabs: Overview, Issues, Statements, Voting Record, Polls, Campaign Finance, Updates | Cards are name, party code, and a link. Pages list Form 2s. No photos, sites, issues, votes, polls, or finance. |
| Ballot measure and judicial pages with office-appropriate fields | No measure or judicial types. |
| Officeholders in a separate directory from people who have filed | No officeholder directory. The app only lists filers, which is the right separation once a directory exists. |
| ZIP starts a search and is not presented as a confirmed personal ballot. Address only when needed and not retained casually | ZIP lookup works for congressional districts via Census TIGERweb (`src/lib/geo/zip-districts.ts`) and pins House plus Senate. Copy warns about split ZIPs. It cannot resolve state legislative, county, city, school, or judicial districts. Addresses are not stored. |
| Ask panel on the race, with prompts about debates, issues, and amendments; citations; no invented votes or quotes; report an error | Ask is a global filings assistant (`src/lib/chat/**`). It cites stored FEC pages, refuses voting advice, and says when the table has no positions. It has no debate corpus, no report-an-error control, and an alignment mode (`src/lib/chat/alignment.ts`) for “whose views match mine.” |
| Follow race or candidate. Alerts for filings, ballot status, statements, polls, debates, deadlines. Digest, quiet hours, unsubscribe | No accounts and no alert pipeline. |
| News preferences separate from notification permissions. Finance and one PAC profile. Branding uploads | None of these pages exist. |
| Coverage status and last checked on the page. Review queue. Separate person, office, cycle, and candidacy | `coverage.ts` and the watermark are honest about Form 2 scope. There is no review queue. Candidate identity is the FEC id, with read-time name collapse. |
| Every visible control works or is labeled a preview | Current controls work for the filing product. They are the wrong controls for the brief. |

### District vintage to reconcile before the Kentucky map is treated as ballot geography

Two code paths name different Congresses:

- Static state maps use Census `cb_2024_us_cd119_5m` (119th Congress). README and `public/geo/cd119/`.
- ZIP lookup comments and the TIGERweb district layer target the 120th Congress (`src/lib/geo/zip-districts.ts`).

Phase 1.5 resolved this. The district map in `public/geo/cd120` and ZIP lookup both use Census 120th Congressional Districts (TIGERweb current layer, January 1, 2026). The older `public/geo/cd119` files remain in the repo for the existing 119th-Congress test and are not what the page draws.

## Scrap vs keep

| Area | Decision | Files | Why |
| --- | --- | --- | --- |
| Homepage and app frame | **Scrap and replace** | `src/app/page.tsx`, `src/components/Landing.tsx`, `src/components/AppFrame.tsx`, `src/app/not-found.tsx` | The home page is the map, including the scroll lock. The new `/` is a normal document: headline, search, steps, featured items, map later, founder, footer. |
| Header, footer, brand chrome | **Scrap and replace** | `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, brand mark inside the header | Navigation and footer in the brief do not exist. Wordmark can stay as text until a logo file is supplied. Do not invent a founder photo. |
| Visual system | **Scrap and replace** | `src/app/globals.css` theme, map-chrome, glass, dark-mode blocks | Tokens move to navy `#142B49`, red `#B32635`, white `#FFFFFF`, gray `#F4F6F8`, ink `#202833`. Drop dark mode on the public site so party and brand colors stay stable. Keep the system font stack so Amplify builds do not fetch fonts. Body copy about 18px. |
| Map interaction chrome | **Scrap the product role; keep geography** | `src/components/UsMap.tsx`, `DistrictMap.tsx`, `MapGesture.tsx`, `useMobileSheet.ts`, `ZipLookup.tsx`, `StateScoreboard.tsx`, `src/lib/map/gesture.ts` | Pinch, glass ZIP, and the mobile sheet are the current product. The brief wants a calmer map lower on the page, plus a written state list. Rebuild a smaller Explore map that still uses the kept shapes. |
| State shapes and district files | **Keep** | `src/lib/geo/us-states.ts`, `state-labels.ts`, `dc-label.ts`, `public/geo/cd119/*.json`, `src/lib/geo/cd119.ts` | Hand-built or Census geometry is expensive to redo and is the Explore-by-State feature. Reconcile 119th vs 120th before calling it the 2026 ballot map. |
| ZIP lookup | **Keep, change the promise** | `src/lib/geo/zip-districts.ts`, `src/lib/lookup/**` | Census intersection, 7 second budget, split-ZIP behavior, and tests are the right “start with a ZIP” engine. New copy must say this is congressional districts, not a personal ballot, and must offer the state list when the ZIP is ambiguous or local offices are missing. |
| Race and candidate pages | **Scrap the UI; keep the reads** | `src/app/races/[raceId]/page.tsx`, `src/app/candidates/[candidateId]/page.tsx`, `CandidateDisclosure.tsx`, `CandidateTechnicalDetails.tsx`, `MultiFilingDetails.tsx` | Visitors need comparison tabs and a profile. The server reads (`src/lib/data/read.ts`) stay. Filing rows move under a “Filings” disclosure so a Form 2 is not presented as a biography. |
| Ask UI | **Scrap the chrome** | `src/components/chat/**`, `src/app/chat/page.tsx`, `src/lib/chat/ui.ts` | The brief wants a panel on the race page with labeled prototype answers. The current sheet is a filings chatbot. |
| Filings assistant library | **Keep, demote** | `src/lib/chat/handler.ts`, `tools.ts`, `prompt.ts`, `roster.ts`, `run.ts`, `converse.ts`, `freshness.ts`, `rate-limit.ts`, `intent.ts`, `polish.ts`, `definitions.ts`, `errors.ts` | Grounding, citations, “filings are not a ballot,” and refusal to invent positions already match the brief’s sourcing rules. They answer only the fields the table has. Do not point this model at sample issue text. |
| Viewpoint alignment mode | **Drop from the public product** | `src/lib/chat/alignment.ts`, `CANDATE_CHAT_ALIGNMENT` | The brief separates factual comparison from persuasion. This mode is the opposite feature. Leave the code uncalled, or keep the env flag defaulting off on the new site. |
| Read API and agent docs | **Keep, remove from the public header** | `src/app/api/v1/**`, `src/lib/api/**`, `src/app/openapi.yaml/route.ts`, `src/app/llms.txt/route.ts`, `src/app/agent/page.tsx`, `src/components/AgentApiDocs.tsx` | Same records as the HTML, useful for the new pages and for later admin tools. “Agent API” is not a footer item for voters. Park it under a developer link on About or Sources. |
| Domain types for filings | **Keep and extend later** | `src/lib/types.ts`, `src/lib/data/items.ts`, `keys.ts`, `view.ts`, `party-codes.ts`, `names.ts`, `dedupe.ts`, `coverage.ts`, `calendar.ts`, `cycles.ts`, `expected-races.ts`, `senate-classes.ts`, `at-large.ts`, `states.ts`, `filing-note.ts`, `cross-filings.ts`, `repository.ts`, `memory-repository.ts`, `read.ts` | This is a solid Form 2 store. It cannot hold measures, issues, polls, or users. Add new types beside it. Do not overload `Race` with a fake ballot measure. |
| FEC ingest | **Keep** | `src/lib/fec/**`, `src/lib/ingest/**`, `workers/fec-ingest/app.ts`, `scripts/ingest.ts`, `scripts/consolidate-presidential.ts` | Only live, scheduled, sourced pipeline. Kentucky federal names should come from here when rows exist. Empty stubs stay empty. |
| Honesty copy and formatting | **Keep and restyle** | `src/lib/copy.ts`, `src/lib/format.ts`, `RecordMeta.tsx`, `DataRefreshedBanner.tsx`, `CoverageNote.tsx`, `StorageNotice.tsx` | “Form 2 is not the ballot,” general-election date math, party labels, source URL, and `updatedAt` are product requirements. Restyle the components. Do not soften the sentences. |
| Query persistence | **Keep the idea** | `src/lib/landing/state-query.ts` | Year, state, and ZIP already survive navigation. New routes should keep that context in the path or the query. The map `pushState` wiring can go away with `Landing`. |
| Placeholder fixture | **Replace** | `src/lib/placeholders.ts` | Too thin, and pages are forbidden from importing it. The pilot needs an explicit content module, for example `src/content/pilot/`, whose every record has a status of `working`, `demonstration`, `awaiting-content`, or `planned`. |
| Amplify hosting | **Keep** | `amplify.yml`, `scripts/write-amplify-server-env.mjs`, `next.config.ts`, `.nvmrc`, `package.json` engines | WEB_COMPUTE SSR is the right host for a server-rendered race page that reads DynamoDB. Stay on Next.js 15.5 while Amplify’s documented SSR support is the reason this repo avoided Next 16. Extend the env allowlist when new variables appear. |
| SAM data stack | **Keep, extend only in a later phase** | `infra/template.yaml`, `infra/samconfig.toml` | Table, retain policy, PITR, least-privilege ingest role, and six-hour schedule are sound. Do not fold user accounts into this table. Do not switch on `DeleteItem`. |
| UI tests tied to the map | **Rewrite with the new shell** | `test/landing.test.ts`, `ui-polish.test.ts`, `ui-pack.test.ts`, `mobile-shell.test.ts`, `map-select.test.ts`, `gesture.test.ts`, `chat-ui.test.ts` | They will fail the moment `/` is a homepage. Replace them with journey tests. Do not “fix” them by bending the new design back into a map. |
| Data and API tests | **Keep** | listed in the inventory above | They are the regression net for ingest, ids, Kentucky stubs, ZIP parsing, and the read API. |

## Why B is the smaller risk

The brief’s first slice is mostly new pages and a strict labeling system. The second slice is “connect verified data for a defined pilot area.” Kentucky federal Form 2 data is the only verified feed already connected, and the code already refuses to treat it as a ballot. Approach A spends the first slice reimplementing that feed. Approach B spends it on the pages the owner can look at.

What B still throws away is large and should be thrown away: the map-as-product, the teal and dark theme, the Ask sheet as the primary AI, and the tests that freeze that UI. What it refuses to throw away is the part that would be reckless to fake: sourced filings, empty-state stubs, coverage math, and the watermark.

Cutover shape:

1. Implement the new route tree on a branch without deleting `src/lib/data`, `src/lib/fec`, `src/lib/ingest`, `src/lib/geo`, `workers/`, or `infra/`.
2. Move today’s map to something like `/explore` only if it is still needed as a reference during the build. The shipped Explore page should be the calmer map plus a state list, not the current glass shell.
3. Keep `npm test` green for the data-plane files on every increment. Replace map tests in the same change that replaces `/`.
4. Merge to `main` when the Kentucky journey, prototype labels, and inventory page are reviewable. That merge is the production cutover for `voter.naijei.com`.

## Phased plan for the pilot only

No calendar estimate. The phases are ordered by dependency. Phase 1 does not change CloudFormation. Phase 2 adds identity. Phase 3 adds a second federal source only if Phase 1 has shipped the labeled journey.

### Phase 1 — Shell, Kentucky journey, labeled prototypes

No new AWS resources. Reads go through the existing repository. Sample material lives in the repo, not in `candate-voter`.

New public routes (names can shift, the jobs cannot):

| Route | Job |
| --- | --- |
| `/` | Homepage in the brief’s top-to-bottom order. ZIP and state search. Map below the fold. |
| `/states` | Searchable state list and the rebuilt map. |
| `/states/ky` | 2026 selected, federal general date from `generalElectionLabel`, category filters, coverage gaps for non-federal. |
| `/races/2026-senate-KY` and one House id such as `/races/2026-house-KY-06` | Permanent race URL. Real filers from DynamoDB. Empty list stays empty. |
| `/races/[raceId]/compare` | Equal cards. Tabs: Overview, Issues, Statements, Voting Record, Polls, Campaign Finance, Updates. |
| `/candidates/[candidateId]` | One real filer, with demonstration profile fields labeled. |
| `/measures/example-kentucky` | Measure layout. Title makes the demonstration status obvious. |
| `/news`, `/polls`, `/finance` | News and polls stay sample. Finance lists FEC totals and Schedule E aggregates. |
| `/about`, `/sources`, `/accessibility`, `/privacy`, `/terms`, `/contact` | Shells. Approved copy only. Missing bio and legal text render as “awaiting approved copy.” |
| `/account`, `/sign-in` | Follow and alert demo. |
| `/explore` | Optional during the branch. Not a second product. |

Suggested Kentucky path, all linked from the homepage search and from the state list:

Homepage → Kentucky → 2026 → Federal → U.S. Senate (or one House district) → candidate cards → comparison → sample measure page linked from the state page as a demonstration.

Category filters for state, county, city, judicial, and school board render on the Kentucky page and return an explicit coverage gap. They do not invent contests.

AI panel on the race page, desktop beside the comparison and a button on mobile:

- Two canned answers with source, date, and a quote/summary/interpretation label.
- One no-evidence answer.
- Report an error, which in this phase confirms on the page and does not claim a filing was sent.
- A visible label: prototype, not retrieval. This panel does not call Bedrock and does not call `POST /api/chat`.
- The filings assistant may remain available from Sources or from a control labeled “Ask about stored FEC filings,” still bound by the current tools.

Follow:

- Buttons on the race and the candidate.
- Signed-out visitors can browse. Save and alerts ask for sign-in.
- Phase 1 sign-in is a labeled preview. Preferences live in component state so a refresh can clear them, and the page says they are not stored on the server.
- Screens for empty, loading, error, and no-results.
- Category toggles, digest versus immediate, quiet hours, unsubscribe. None of them send email or push.

Branding: a typed module (copy, alt text, image paths) that the team can replace in git. Image slots use labeled placeholders until files exist. S3 upload waits for accounts.

ZIP: the existing lookup, with new sentences. A result lists congressional districts and the Senate race id. It tells the visitor this is not their full ballot and points at the state page for everything else.

Campaign finance tab and PAC page: demonstration numbers only, with the source named as sample. Direct contributions and outside spending are separate sections even while both are fake, so the layout does not teach the wrong relationship.

Internal status on every pilot module: `working`, `demonstration`, `awaiting-content`, or `planned`. Public pages show “Sample” whenever the status is not `working`.

### Phase 2 — Accounts and saved preferences

Small AWS add, still not a new product surface:

- Amazon Cognito user pool for email/password sign-in, in `us-east-1`. Hosted UI or a simple Next form. No social login required for the pilot.
- A second DynamoDB table, proposed name `candate-voter-users`, retain on delete, on-demand. Items are follows and alert preferences. Partition by the Cognito user id. Do not write user rows into `candate-voter`.
- SSR compute role: read and write that user table only. Ingest role unchanged.
- Report-an-error writes a row the team can read. It is not yet a public corrections desk.
- Still no SES, no push, no digest worker. The alert screen keeps saying delivery is not running.
- `amplify.yml` env writer gains the user-table name and the Cognito pool id. No secrets in `NEXT_PUBLIC_` except the public pool client id.

Skip Phase 2 if the owner only needs to judge the design. The brief allows a demonstration as long as it says what works. Phase 1 already does that.

### Phase 3 — Verified Kentucky federal data, still not a full Kentucky ballot

Only after the journey is up:

- Keep the Form 2 job. Show watermark time as “last checked” on Kentucky federal pages. If the last run failed, show the failure. Do not leave a stale roster looking current.
- Ballot status stays “not verified” until a person checks the Kentucky State Board of Elections (elect.ky.gov) or an official feed we name. A Form 2 never flips that badge by itself.
- Optional second ingest, own watermark (`INGEST#FEC_TOTALS` or a sibling): OpenFEC candidate totals for receipts, disbursements, and cash on hand, for the Kentucky federal candidate ids already stored. Same API key family, new mapper, new tests. Schedule A itemization and Schedule E outside spending stay out of this phase because volume, amendments, and double-counting need their own design.
- Voting record, if shown for a federal incumbent, comes from a cited Congress.gov page (bill, date, vote, URL) entered as sourced data. A challenger with no legislative service sees an explanation, not an empty score.
- State, county, city, judicial, school, and real ballot measures stay coverage gaps until a source, access method, refresh, cost, and fallback are written down and a sample import is reviewed. No scraper in the pilot.

Out of the pilot entirely: nationwide rollout, poll averages, speech-theme analysis, PAC ad tracking, social listeners, mobile push, a staff review-queue UI beyond the Phase 2 error log, and any claim of instant alerts.

## What must work, and what may be a placeholder

### Must work in the pilot the owner reviews

- Homepage and every header and footer link open a real page.
- Desktop and a narrow mobile layout. Keyboard focus, labels, and contrast on the navy and red tokens. Touch targets that are easy to hit. No autoplaying video.
- Kentucky 2026 federal path using live repository data. If a district has no filing, the page says so. It does not add sample people to the real list.
- One comparison layout with the same fields on every card, including uncontested and more-than-two layouts (the second can be a labeled sample race if the live Senate field is a poor fit).
- One measure page whose heading identifies it as a demonstration.
- AI prototype with the two sourced examples, the no-evidence example, and the correction control, labeled as a prototype.
- Follow flow with the four states (empty, loading, error, no results) and a sentence that says nothing is emailed.
- ZIP search that returns congressional districts or a clear failure, and never the words “your ballot” as a confirmed personal ballot.
- A Sources page that is this inventory, including last-checked behavior and the 119th/120th reconciliation note.
- Sample badges on every non-working fact.

### Acceptable as a placeholder

- Photographs, biographies, issue grids, quotations, voting tables, poll tables, fundraising figures, the PAC profile, and news cards, all badged Sample.
- Founder portrait, biography, and any quote. Use only copy Luke Wyatt approves. Until then, the section is a named placeholder, not generated prose.
- Legal pages: short “awaiting approved copy” rather than invented privacy or terms text.
- Sign-in, email, and push, until Phase 2 or later.
- Brand file upload. Git-managed content is enough for Phase 1.
- Officeholder directory: a page that explains it is separate and not loaded.
- Non-federal Kentucky contests: filter controls plus a coverage gap.
- The correction control actually filing a ticket, until Phase 2.
- `/api/v1` and `/agent`, left in place and out of the voter navigation.

### Demonstration rules

- Do not add fictional candidate names on a page that also lists real filers.
- Do not title a sample measure as a 2026 Kentucky ballot question unless an official source says that question is on the ballot, and then cite it.
- Do not write testimonials, employer affiliations, or a founder biography.
- Do not let the model answer from sample issue text. A claim inside a fixture is not an instruction and not a fact.
- Party is a text label. Card chrome stays neutral. Red is for actions, not for a party.

## AWS changes to make early

Phase 1: none. Do not redeploy the SAM stack to restyle the site. Do not enable Bedrock for the new panel. If the existing Ask stays on for staff, leave it on the filings tools only and set `CANDATE_CHAT_ALIGNMENT=false`.

When Phase 2 starts, edit `infra/template.yaml` (or a second template in `infra/` if mixing user data into the ingest stack is undesirable):

- New table `candate-voter-users`. Retain, PITR, on-demand. No GSI until a real access pattern needs one.
- Cognito user pool and app client. Callback URLs for `voter.naijei.com` and localhost.
- Outputs for the table name and pool id, consumed through the Amplify env writer.
- SSR policy for the user table. Ingest Lambda policy untouched.
- Still no `DeleteItem` on `candate-voter`. User-table deletes, if any, can wait until account deletion is a real feature.

Do not adopt Amplify Gen 2 to get auth. A user pool plus the existing Next server is the smaller change.

Later, and not required to judge this plan:

- S3 bucket for logo and homepage images, with the SSR role allowed to read and a staff role allowed to write.
- SES for a digest, only after From-address, unsubscribe, and bounce handling exist.
- A second ingest Lambda for FEC totals, same account and region, own cursor, own log group.
- Bedrock remains off for prototype answers. If a future race assistant retrieves sourced documents, it gets its own tool list and a spend cap. The current in-memory rate limit is per server process and is not a global cap (`src/lib/chat/rate-limit.ts`).

Leave the filings table name, region, and retain policy alone.

## Source and coverage inventory

Status words match the brief: working, demonstration only, awaiting content, or planned.

| Need | Status | Source | Access | Refresh | Cost | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| Federal filer name, party code, FEC id, filing PDF, load time | **Working** | OpenFEC `GET /v1/efile/form2/` | `FEC_API_KEY` on the Lambda only. Free api.data.gov key is 1,000 calls/hour. `DEMO_KEY` is not enough for a full run. | EventBridge every 6 hours. Cursor is inclusive by calendar day. | API is $0. Lambda and logs are small at this volume. | Show `lastStatus`, `lastError`, and `updatedAt` from `INGEST#F2`. Never swap in sample filers. |
| House and Senate contest stubs for an even year | **Working** | `expected-races.ts`, `senate-classes.ts`, `at-large.ts` | In-process. Not a feed. | On each read. | $0 | Empty stub with `empty: true`. |
| ZIP to congressional district | **Working, limited** | Census TIGERweb ZCTA intersect current congressional districts | Public HTTP, no key, 7 second budget, in-memory cache | Live | $0 | 404 or timeout copy, then the state list. Not a full ballot. |
| District shapes | **Working, vintage conflict** | `public/geo/cd119` (119th) vs ZIP layer (120th) | Static files vs live Census | Manual file replace | $0 | Do not draw a district the ZIP layer disagrees with until one vintage is chosen. |
| Ballot qualification | **Planned** | Kentucky State Board of Elections, elect.ky.gov, and county clerks for local | No adapter in the repo. Public pages, not a contracted feed. | Unknown until a method is chosen | Staff time or a future fee | Badge stays “filing detected, ballot status not verified.” |
| State, county, city, judicial, school contests | **Planned** | Same Kentucky offices. No national API covers them. | Not connected | Not set | Unknown. Likely staff time more than AWS. | Category filter explains the gap. |
| Ballot measure official text | **Demonstration in the pilot** | Official KY SOS text when a real question is chosen | Manual citation | Manual | $0 if manual | Sample layout with no fake legal effect. |
| Campaign photo and website | **Awaiting content** | Candidate’s own site, or a later FEC field we do not map today | Manual for the pilot. Form 2 mapper drops address and does not read a URL (`src/lib/fec/types.ts`). | Manual | Staff time. Do not hotlink unlicensed photos. | Initials and “website not verified.” |
| Biography, issues, statements, endorsements | **Awaiting content** | Campaign sites, debate transcripts, official remarks | No corpus | Not set | Staff or a later licensed archive | Tab says the information is not available. The model is not asked to fill it. |
| Voting record | **Planned** | Congress.gov for federal incumbents | Free API key, not wired | Manual or a later job | $0 at API level | “No legislative votes in this record,” never a blank that looks like a poor score. |
| Polls | **Planned** | No vendor selected | None | None | Often the first real data invoice. Do not assume a feed. | “No qualifying polls available.” |
| Fundraising totals | **Planned** | OpenFEC candidate totals and reports | Same key family as Form 2, different endpoints | Own cursor, not the Form 2 cursor | $0 API. Extra Lambda time. | Finance tab stays Sample. |
| Itemized donors and outside spending | **Planned** | OpenFEC Schedule A and Schedule E | Same | Heavier than Form 2. Amendments must not be double-counted. | $0 API, more storage | Do not describe outside spending as money the campaign received. |
| PAC profile | **Demonstration** | Sample page now. OpenFEC committee endpoint later. | Not connected | Not set | $0 until connected | One labeled example. |
| News and statements | **Demonstration** | None licensed | None | None | Unknown | Sample cards with publisher, date, and a fake URL that is not presented as live reporting. |
| Personalized feed and alerts | **Demonstration, then Phase 2 storage** | First-party preferences | Not built | n/a | Cognito and a small table later | UI only. No delivery promise. |
| Brand assets and founder bio | **Awaiting content** | Files and copy from Luke Wyatt | Git in Phase 1, S3 after auth | When supplied | $0 | Placeholders with alt text. No invented biography. |
| Review queue and corrections | **Planned** | First-party | Phase 2 can store a report row | n/a | Small | Prototype button does not claim the report was delivered. |
| Social posts | **Planned** | Platform APIs | Access and permissions not confirmed | Unknown | Often restricted or paid | The product must not promise social coverage. |

### Recurring cost notes

These are planning ranges from public AWS pricing patterns, not a quote. Re-check the price list before telling the client a number. At current volume the data plane is the cheap part. A polling vendor or a licensed ballot file would dwarf it.

| Line | What drives it | Planning note |
| --- | --- | --- |
| Amplify Hosting SSR | Build minutes, request duration, data transfer | Largest current line once the site is public. The chat route holds a request open for model time (budget about 20 seconds). The prototype panel should not do that. |
| DynamoDB `candate-voter` | On-demand reads and writes, PITR storage | Form 2 is thousands of small items. Expect a small monthly bill, often dominated by PITR rather than requests. |
| Ingest Lambda and logs | Four short runs a day, 512 MB arm64, 30-day logs | Small. A full historical backfill is larger and should stay manual. |
| FEC and Census | Quotas, not invoices | $0 at the current free tiers. The operational risk is rate limits and TIGERweb latency, which the client already handles. |
| Bedrock | Tokens, if Ask is enabled | $0 for the prototype panel. There is no app-wide spend cap today. Leave the race-page prototype off the model. |
| Cognito and `candate-voter-users` | Monthly active users, tiny items | Phase 2. Cognito has a free tier; a pilot account list should stay inside it. |
| SES, push, S3 brand bucket | Messages, stored images | Not in the pilot. |
| Polls, ballot files, news wires | Licenses | Unscoped on purpose. Do not include them in the hosting estimate. |

## Acceptance checks for the pilot PR that follows this one

A reviewer who has not seen the brief can do this:

1. Open `/` and read what the site is, without using the map.
2. Start from ZIP `40502` or from the Kentucky line in the state list and land on Kentucky 2026.
3. See federal races, and see a plain statement that state and local contests are not covered.
4. Open the Senate race or a House district. Names on that page match the table. A district with no filings does not grow sample names.
5. Open comparison. Cards match. Tabs that lack data say so. The finance tab is labeled Sample.
6. Open one candidate and the sample measure. The measure cannot be mistaken for a certified 2026 question.
7. Open Ask on the race. See a sourced example, a no-evidence example, and a correction control. The panel says it is a prototype.
8. Follow the race while signed out and get a sign-in preview. Open alert settings and see empty, error, and no-results treatments, plus a sentence that no message will be sent.
9. Resize to a phone width and repeat the race page, the panel button, and the follow control.
10. Open Sources and find this inventory, the Form 2 watermark explanation, and the district-vintage note.

## What this review does not do

No page redesign, no token change, no route change, no SAM change, and no new dependency. The running site stays the map until a later PR replaces it.

If approach B is approved, the next implementation PR should be Phase 1 only: the shell, the Kentucky federal journey on live filings, and labeled prototypes. It should not include Cognito or a second ingest.
