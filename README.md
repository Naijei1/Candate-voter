# Candate

Nonpartisan federal election tracker. This Next.js app lists U.S. President, Senate, and House races and candidate pages from stored FEC Form 2 filings, with sources and retrieval timestamps.

The site does not call the FEC and does not give voting advice. Ingest writes the table from the SAM stack described below.

The public URL is [voter.naijei.com](https://voter.naijei.com). `naijei.com/voter` will redirect there. A later option is to serve this same app under the `/voter` path; see [Base path](#base-path).

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

Links use `next/link` with app-relative paths so they follow `basePath`. Server components read stored races, candidates, and filings through `createDynamoRepository()`. `src/lib/placeholders.ts` is a fixture module and is not imported by those pages.

## Data model

Federal races, candidates, and Form 2 filings live in one DynamoDB table, `candate-voter`, in **us-east-1**. Shapes are `src/lib/types.ts`. Access helpers are `src/lib/data/repository.ts` (DynamoDB) and `src/lib/data/memory-repository.ts` (local dry run). Pages call `createDynamoRepository()` from `src/lib/data/read.ts`.

One table fits this workload. The access patterns are known and hierarchical, the rows are small, and a federal Form 2 pass is thousands of items rather than a case for splitting storage. A separate ingest cursor lives in the same table. Party is the code the filing reported. There is no score, rating, ranking, or endorsement attribute.

`pk` / `sk` are the table keys. GSI `gsi1` (`gsi1pk` / `gsi1sk`, projection ALL) serves the two list queries. The index name is part of the contract with `infra/template.yaml`.

| Access | Key |
| --- | --- |
| Get race | `pk = RACE#<raceId>`, `sk = META` |
| List races in a cycle | `gsi1pk = CYCLE#<year>` |
| Get candidate | `pk = CAND#<candidateId>`, `sk = META` |
| List candidates in a race | `gsi1pk = RACE#<raceId>` |
| List filings for a candidate | `pk = CAND#<candidateId>`, `sk` begins_with `FILING#` |
| Ingest cursor | `pk = INGEST#F2`, `sk = WATERMARK` |

Race ids:

| Contest | `raceId` |
| --- | --- |
| President | `2028-president` |
| Senate | `2026-senate-CA` |
| House | `2026-house-CA-07` (`00` is at-large) |

The cycle is the election year on the filing, not a guessed calendar. A repeat ingest updates the same keys (`UpdateItem`). A candidate row moves forward only when the filing's FEC load timestamp is greater than or equal to `sourceLoadedAt`, so an older amendment overlap does not rewind the name or party.

Every stored race, candidate, and filing has `sourceUrl` and a write timestamp (`updatedAt`). Filings also have `retrievedAt`. The electronic Form 2 feed does not include a submission time, so `filedAt` stays null and `fecLoadTimestamp` holds FEC's load time (`YYYY-MM-DD HH:MM:SS`). Street address, city, and ZIP from the filing are not stored.

## FEC ingest

Discovery uses the electronic Form 2 feed, which FEC posts as filings arrive. The processed candidate master lags that feed by a nightly load.

| | |
| --- | --- |
| Endpoint | `GET https://api.open.fec.gov/v1/efile/form2/` |
| Docs | [OpenFEC API](https://api.open.fec.gov/developers/) |
| Offices | `candidate_office` repeated for `H`, `S`, and `P` |
| Page size | `per_page` max **100** |
| Sort | `load_timestamp` ascending, nulls last |
| Cursor | `min_load_timestamp`, **inclusive** (`>=` in openFEC). The API accepts `YYYY-MM-DD` only, so the request uses the cursor's calendar date and that day is read again. The stored cursor keeps seconds. |
| Auth | Query parameter `api_key` |

The API requires a key. [`DEMO_KEY`](https://api.open.fec.gov/developers/) is the public demo key. A response on 2026-10-26 reported `x-ratelimit-limit: 10` for that key, so it can smoke-test about one page. A free key from [api.data.gov/signup](https://api.data.gov/signup/) allows **1,000 calls per hour**. This repo does not contain a key.

The client pauses 250ms between pages (`FEC_MIN_DELAY_MS`). On HTTP 429 or 5xx it retries up to 5 times with exponential backoff and uses `Retry-After` when that wait is under 120 seconds. A longer rate-limit window fails the run after the cursor for completed pages is saved. Errors never include the API key.

The job walks pages until a short page, then stores the newest load timestamp. On a full page it stores the newest timestamp strictly below the page maximum, so a timestamp split across pages is read again. Upserts make that overlap safe. A full page where every row shares one timestamp does not move the cursor; the current run keeps paging, and a restarted run repeats that timestamp instead of skipping it.

Run one ingest without AWS (prints the records the accessors read back):

```bash
npm install
FEC_API_KEY=DEMO_KEY npm run ingest -- --dry-run --max-pages 1
```

`--from "2026-10-01 00:00:00"` sets the inclusive cursor. `--reset-watermark` starts over on a real table. Omit `--dry-run` to write to DynamoDB (`CANDATE_TABLE_NAME`, `AWS_REGION`, and credentials that can `GetItem`, `UpdateItem`, and `Query`).

```bash
npm test
```

## Deploy the data stack

Amplify Hosting stays as it is. `infra/template.yaml` is a separate SAM stack, `candate-voter-data`, for account **402275401617** in **us-east-1**. It creates:

| Resource | Name |
| --- | --- |
| DynamoDB table | `candate-voter` (on-demand, point-in-time recovery, retain on stack delete) |
| Lambda | `candate-voter-fec-ingest` (Node.js 22, arm64, 512 MB, 15 minute timeout) |
| Schedule | EventBridge `rate(6 hours)` |
| Log group | `/aws/lambda/candate-voter-fec-ingest` (30 day retention) |
| IAM | `dynamodb:GetItem`, `UpdateItem`, and `Query` on the table and `gsi1` |

The Lambda role is not the Amplify service role. Deploying this stack does not change the Amplify app, domain, or `amplify.yml`.

Install the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), then from `infra/`:

```bash
sam build
sam deploy --parameter-overrides FecApiKey="$FEC_API_KEY"
```

`samconfig.toml` sets the stack name, region, and `CAPABILITY_IAM`. Confirm the changeset before applying it. Pass `TableName` or `ScheduleExpression` in the same `--parameter-overrides` when you want something other than the defaults. CloudFormation `NoEcho` keeps the key out of the template; it is still visible to principals who can read the Lambda configuration. Do not commit it.

Same code path, different scheduler: `npm run ingest` on any host with the env vars above. The EventBridge function is the path that matches "within hours" on AWS.

After the first scheduled run, check the log group. A manual one-page check:

```bash
aws lambda invoke \
  --function-name candate-voter-fec-ingest \
  --region us-east-1 \
  --payload '{"maxPages":1}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/candate-ingest.json
```

## Race pages

`/`, `/races/[raceId]`, and `/candidates/[candidateId]` are server components. They call `createDynamoRepository()` and set `dynamic = "force-dynamic"`, so `next build` does not query the table and does not prebuild ids from `src/lib/placeholders.ts`. The Amplify SSR compute role (not the build role) needs `dynamodb:GetItem` and `dynamodb:Query` on the table and `gsi1`. Leave `FEC_API_KEY` on the Lambda only.

Amplify Hosting puts branch environment variables in the build shell and does not pass them to the Next.js server at request time. `amplify.yml` copies `CANDATE_TABLE_NAME`, `CANDATE_CYCLES`, and `NEXT_PUBLIC_*` into `.env.production` before `next build`. Next.js loads that file when it serves traffic. If `CANDATE_TABLE_NAME` is still unset, reads use `candate-voter`. `AWS_REGION` falls back to `us-east-1` in the repository client. Neither value is a secret.

The home index queries `listRacesByCycle` for each year in a window: the previous UTC calendar year through six years ahead. `CANDATE_CYCLES` (comma-separated years) overrides that window. A query with no rows renders an empty state. A storage error renders an error message and does not substitute sample rows.

Each race and candidate shows `sourceUrl` and `updatedAt`. Each filing shows `sourceUrl`, `updatedAt`, and `retrievedAt`. `filedAt` is shown only when that filing has one. Party is the code stored from the filing. The pages do not show scores or endorsements. Candidates are listed alphabetically by display name.

SSR compute role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:402275401617:table/candate-voter",
        "arn:aws:dynamodb:us-east-1:402275401617:table/candate-voter/index/gsi1"
      ]
    }
  ]
}
```

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

Branch environment variables are available to the build shell. `amplify.yml` copies the site's variables into `.env.production` so the Next.js server can read them. `CANDATE_TABLE_NAME` is optional: an empty value selects `candate-voter`.

| Name | MVP value |
| --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | Leave unset or empty. |
| `AWS_REGION` | Optional. `us-east-1` when unset. The repository client does not need this copied into `.env.production`. |
| `CANDATE_TABLE_NAME` | Optional. `candate-voter` when unset. |
| `CANDATE_CYCLES` | Optional. Comma-separated election years for the home index. When unset, the page queries the previous UTC year through six years ahead. |

`FEC_API_KEY` stays on the ingest Lambda (or the shell that runs `npm run ingest`). The site does not call OpenFEC.

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
- **DynamoDB single table plus a SAM-scheduled Lambda** beside Amplify Hosting. The hosting build stays `amplify.yml` / `WEB_COMPUTE`. Gen 2 (`ampx`, AppSync) is not required for this ingest path.
