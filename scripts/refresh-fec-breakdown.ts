/**
 * Refreshes data/ky-fec-breakdown.json from OpenFEC committee totals.
 *
 *   FEC_API_KEY=... npm run refresh:fec-breakdown
 *   npm run refresh:fec-breakdown -- --from-raw path/to/fec-totals-raw.json
 *
 * Committees come from data/ky-fec-feed-finance.json. `--from-raw` reads saved
 * API responses ([{ candidateId, committeeId, name, results: [...] }]) instead
 * of calling the API.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import feed from "../data/ky-fec-feed-finance.json";
import { breakdownFromTotals, type FundingBreakdown } from "../src/lib/finance/breakdown";
import { FecClient, fecApiKeyFromEnv } from "../src/lib/fec/client";
import { stateConfig } from "../src/lib/states";

const OUT = path.join(__dirname, "..", "data", "ky-fec-breakdown.json");
const CYCLE = stateConfig("KY").cycle;

type RawRow = { candidateId: string; committeeId: string; name: string; results?: Record<string, unknown>[] };

async function main() {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf("--from-raw");
  const retrievedAt = new Date().toISOString().slice(0, 10);
  let rows: FundingBreakdown[];

  if (rawIndex >= 0) {
    const file = args[rawIndex + 1];
    if (!file) throw new Error("--from-raw needs a file path.");
    const raw = JSON.parse(readFileSync(file, "utf8")) as RawRow[];
    const dated = args.includes("--retrieved") ? args[args.indexOf("--retrieved") + 1] : retrievedAt;
    rows = raw.map((row) =>
      breakdownFromTotals({ ...row, cycle: CYCLE, totals: row.results?.[0] ?? null, retrievedAt: dated }),
    );
  } else {
    const client = new FecClient({ apiKey: fecApiKeyFromEnv(), minDelayMs: 400 });
    rows = [];
    for (const committee of feed.committees) {
      const totals = await client.getCommitteeTotals(committee.committeeId, CYCLE);
      rows.push(breakdownFromTotals({ ...committee, cycle: CYCLE, totals, retrievedAt }));
    }
  }

  const latest = rows.map((row) => row.retrievedAt).sort().at(-1) ?? retrievedAt;
  writeFileSync(OUT, `${JSON.stringify({ cycle: CYCLE, retrievedAt: latest, rows }, null, 1)}\n`);
  console.log(`Wrote ${rows.length} committees to ${path.relative(process.cwd(), OUT)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
