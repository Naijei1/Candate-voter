/** Plain-text index for agents. Paths are absolute for the host that served the file. */
export function llmsText(input: { origin: string; basePath: string }): string {
  const root = `${input.origin}${input.basePath}`;
  return `# Candate

> Nonpartisan federal election records for President, Senate, and House, stored from FEC Form 2 electronic filings only (not a full ballot). Read-only JSON with source links and timestamps. Party is the filing code plus a readable label (\`partyCode\`, \`partyLabel\`). The same normalized name on a race is one display row; \`multiFilingNote\` and \`alternateFilings\` list the other FEC ids and parties. \`filings\`, \`writeIn\`, and \`multiFiling\` list the same person across contests and are not used to hide a row. Identical Form 2 rows are collapsed before the response. \`year\` is an alias of \`cycle\`. A race id year that disagrees with the requested year is omitted. Empty stubs set \`hasCandidates\` to false and are not filings. Presidential general elections are years divisible by 4. A presidential race stored for a midterm such as 2026 is an early or out-of-cycle filing, not the general election. Even-year race lists (index and \`state\` filter) include every apportioned House district and a Senate race when that class is up, including contests with no filing (\`empty: true\`, detail \`candidates: []\`). At-large district \`00\` is only for single-seat states (AK, DE, ND, SD, VT, WY). Multi-seat states do not emit \`00\`; Texas is \`01\` through \`38\` and never \`2026-house-TX-00\`. Off-cycle Senate seats are not invented. \`districtsWithFilings\` counts stored filings only; \`districtsTotal\` matches the House rows. Race list and race detail expose top-level \`refreshedAt\` (ISO-8601, same value as \`coverage.refreshedAt\`) for the page-level data-refreshed banner. Freshness includes the same \`refreshedAt\`. The API has no scores, rankings, endorsements, or voting advice, and it has no write methods. POST /api/chat is a same-origin browser route and does not use the API key. \`mode\` is \`factual\` or \`alignment\`. Alignment is only for an explicit viewpoint question, cites stored filings, and does not say who to vote for. Other agents call /api/v1 with a key.

## Docs

- [Agent API](${root}/agent): coverage, authentication, curl examples, and live ingest freshness
- [OpenAPI](${root}/openapi.yaml): OpenAPI 3.0 description of \`/api/v1\`

## API

Send the key as \`Authorization: Bearer YOUR_API_KEY\` or \`X-Api-Key: YOUR_API_KEY\`. YOUR_API_KEY is a placeholder. HTML pages, including /agent, /openapi.yaml, and /llms.txt, do not require a key.

- GET ${root}/api/v1/races
- GET ${root}/api/v1/races/{raceId}
- GET ${root}/api/v1/candidates/{candidateId}
- GET ${root}/api/v1/candidates/{candidateId}/filings
- GET ${root}/api/v1/freshness
- GET ${root}/api/v1/lookup/zip?zip=40502&year=2026 (cycle is an alias of year; unknown ZIP is 404 \`{error,message,code:zip_not_found}\`; a non-5-digit ZIP is 400 \`code:invalid_zip\`; Census cannot run past 7 seconds)
- POST ${root}/api/chat (browser JSON, no API key, buffered response)

## House district map join

Cycle 2026 in-state House district maps join Frontend static Census CB/TIGER (119th / post-2020) GeoJSON to race ids from \`GET /api/v1/races\`. This API does not expose district geometry and has no \`GET /api/v1/geo\` route. \`raceId\` is \`{cycle}-house-{ST}-{DD}\` (for example \`2026-house-KY-01\`). District codes are zero-padded \`01\` through \`NN\`, matching \`HOUSE_SEATS\` and empty stubs. A single-seat state uses district \`00\` (for example \`2026-house-WY-00\`), not district \`AL\` and not \`01\`. State \`AL\` is Alabama and still uses \`01\` through \`07\`. Scope is the 50 states and 435 House seats. The race list has no DC, Puerto Rico, or territory House stubs. Filings and empty contests come from the race (\`empty: true\`, candidates). The GeoJSON is geometry only. Senate races and a state outline are not part of this Phase A join. ZIP lookup district codes already use the same \`00\` and zero-pad convention. A territory ZIP can still resolve; it is not a House stub on the race list.
`;
}
