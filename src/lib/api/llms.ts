/** Plain-text index for agents. Paths are absolute for the host that served the file. */
export function llmsText(input: { origin: string; basePath: string }): string {
  const root = `${input.origin}${input.basePath}`;
  return `# Candate

> Nonpartisan federal election records for President, Senate, and House, stored from FEC Form 2 electronic filings only (not a full ballot). Read-only JSON with source links and timestamps. Party is the filing code plus a readable label (\`partyCode\`, \`partyLabel\`). The same normalized name on a race is one display row; \`multiFilingNote\` and \`alternateFilings\` list the other FEC ids and parties. Presidential general elections are years divisible by 4. A presidential race stored for a midterm such as 2026 is an early or out-of-cycle filing, not the general election. Race list (index and \`state\` filter) and race detail expose top-level \`refreshedAt\` (ISO-8601, same value as \`coverage.refreshedAt\`) for the page-level data-refreshed banner. Freshness includes the same \`refreshedAt\`. The API has no scores, rankings, endorsements, or voting advice, and it has no write methods. POST /api/chat is a same-origin browser route and does not use the API key. \`mode\` is \`factual\` or \`alignment\`. Alignment is only for an explicit viewpoint question, cites stored filings, and does not say who to vote for. Other agents call /api/v1 with a key.

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
- GET ${root}/api/v1/lookup/zip?zip=40502&year=2026 (cycle is an alias of year; unknown ZIP is 404)
- POST ${root}/api/chat (browser JSON, no API key, buffered response)
`;
}
