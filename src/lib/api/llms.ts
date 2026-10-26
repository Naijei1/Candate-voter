/** Plain-text index for agents. Paths are absolute for the host that served the file. */
export function llmsText(input: { origin: string; basePath: string }): string {
  const root = `${input.origin}${input.basePath}`;
  return `# Candate

> Nonpartisan federal election records for President, Senate, and House, stored from FEC Form 2 filings. Read-only JSON with source links and timestamps. Party is the filing affiliation code. The API has no scores, rankings, endorsements, or voting advice, and it has no write methods. POST /api/chat is a same-origin browser route that answers from these records and does not use the API key. Other agents call /api/v1 with a key.

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
- POST ${root}/api/chat (browser JSON, no API key, buffered response)
`;
}
