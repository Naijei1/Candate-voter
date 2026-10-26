# Candate

Nonpartisan federal election tracker. This repository is the January MVP skeleton: a Next.js app that will list U.S. President, Senate, and House races and candidate pages fed by FEC filings, with sources and retrieval timestamps.

This commit is the scaffold only. It does not call the FEC, write to DynamoDB, or give voting advice.

The planned public URL is [voter.naijei.com](https://voter.naijei.com). `naijei.com/voter` will redirect there. A later option is to serve this same app under the `/voter` path; see [Base path](#base-path).

## Run locally

Requires Node.js 20 or newer (22 is what Amplify is configured to use; see `.nvmrc`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run build
npm start
```

Package manager is npm. Commit `package-lock.json`. Amplify runs `npm ci`.

## Routes

| Path | Page |
| --- | --- |
| `/` | Federal races index |
| `/races/[raceId]` | Race detail |
| `/candidates/[candidateId]` | Candidate detail |

Links use `next/link` with app-relative paths so they follow `basePath`. The pages currently render labeled sample records from `src/lib/placeholders.ts`, not live filings.

## Data model (later)

Persist these in DynamoDB. Shapes live in `src/lib/types.ts`. Do not treat the sample module as a database.

| Table | Primary key | Main access | Notes |
| --- | --- | --- | --- |
| Race | `raceId` | List by cycle and office | President, Senate, or House. State and district when they apply. |
| Candidate | `candidateId` | Query by `raceId` | Display name, office, party as reported on a filing, FEC candidate id. |
| Filing | `filingId` | Query by `candidateId` | MVP form type is FEC Form 2. Store `sourceUrl`, `filedAt`, and `retrievedAt`. |

Suggested key attributes, not a deployed schema:

- Race: PK `raceId`. GSI `cycleOffice` (`cycle` + `office`) for the home index.
- Candidate: PK `candidateId`. GSI `raceId` for the race page.
- Filing: PK `filingId`. GSI `candidateId` for the candidate page.

`updatedAt` on Race and Candidate is when our system wrote the row. `retrievedAt` on Filing is when the worker stored that source. Show both a source link and those timestamps on the page. Do not publish a figure without them.

## FEC ingest is next

A worker (not in this repo yet) should read FEC Form 2 filings and upsert Race, Candidate, and Filing rows. No scraper, API client, or `FEC_API_KEY` is implemented here. Put that key in Amplify environment variables or the worker's secret store when the worker exists. Never commit it.

## Connect Amplify Hosting

This app is set up for **Amplify Hosting** (Git-connected, platform `WEB_COMPUTE`), not an Amplify Gen 2 backend. Gen 2 (`ampx`, `amplify/backend.ts`, AppSync) is a larger step than connecting this repo, and the January page does not need auth or a GraphQL API. Add DynamoDB later from the ingest worker, or adopt Gen 2 data then. Hosting SSR is the path that matches `amplify.yml`.

1. In the AWS console, open Amplify → **Create new app**.
2. Choose GitHub and authorize the account that can see [Naijei1/Candate-voter](https://github.com/Naijei1/Candate-voter).
3. Select this repository and the `main` branch.
4. Let Amplify use the repo `amplify.yml`. Confirm:
   - `artifacts.baseDirectory` is `.next`
   - the build script stays `next build` (no `next export`)
   - `next.config.ts` does **not** set `output: "export"`
5. Create and use a new Amplify service role when the console asks.
6. On the review step, the app should be Next.js SSR on **Amplify Hosting compute** (`WEB_COMPUTE`). If a console created earlier as a static site (`WEB`), SSR will not run; create the app as a Next.js SSR app or set the platform to `WEB_COMPUTE`.
7. Save and deploy.

Build image Node is 22 (`nvm install 22` in `amplify.yml`, `.nvmrc`). Amplify blocks SSR builds on Node 18 and older.

### Environment variables

Set these in the Amplify console for the branch (they are available to `npm run build`):

| Name | MVP value |
| --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | Leave unset or empty. |
| `AWS_REGION` | Add when DynamoDB exists. `us-east-1` is the placeholder in `.env.example`. |

`NEXT_PUBLIC_*` values are inlined at build time. Changing `NEXT_PUBLIC_BASE_PATH` requires a new build.

Copy names from `.env.example`. That file has no secrets.

### Custom domain

After the first deploy, in Amplify → **Domain management**, add `voter.naijei.com`. Create the DNS records Amplify shows at the DNS host for `naijei.com`. This repo does not change DNS.

The separate redirect from `naijei.com/voter` to `https://voter.naijei.com` belongs on the apex site. That redirect does not use `basePath`.

## Base path

Default is the domain root, which is correct for `voter.naijei.com`.

If CloudFront later serves this app at `https://naijei.com/voter`, set `NEXT_PUBLIC_BASE_PATH=/voter` and redeploy. `next.config.ts` sets both `basePath` and `assetPrefix` from that variable (leading slash added, trailing slash removed, empty and `/` ignored). App links stay relative (`/races/...` via `next/link`); do not hard-code asset URLs at the apex host.

## Decisions

- **npm** and `package-lock.json`, because Amplify's build runs `npm ci`.
- **Next.js 15.5** App Router, TypeScript, ESLint, Tailwind CSS. Amplify Hosting compute documents SSR support through Next.js 15, so this app does not use Next.js 16.
- **Amplify Hosting (`amplify.yml`, `WEB_COMPUTE`)**, not Amplify Gen 2 and not a static export. Production build is `next build` (webpack). `npm run dev` uses Turbopack locally.
- **System font stack** so the Amplify build does not depend on downloading fonts.
