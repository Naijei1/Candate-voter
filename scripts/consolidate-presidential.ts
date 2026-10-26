/**
 * Collapse duplicate filers that share a normalized name on the same race.
 *
 * Dry run (default) prints the plan. `--apply` copies each duplicate's
 * filings onto the keeper id and marks the extra row superseded. Superseded
 * rows stay in DynamoDB; list reads skip them. The table role has no
 * DeleteItem permission.
 *
 * Read paths already hide these duplicates and keep a multi-party note.
 * Apply drops the extra rows from that note, which then shows only the
 * keeper's party. Leave rows in place when every FEC id should stay listed.
 *
 *   npx tsx scripts/consolidate-presidential.ts --cycle 2026
 *   npx tsx scripts/consolidate-presidential.ts --cycle 2026 --office senate
 *   npx tsx scripts/consolidate-presidential.ts --cycle 2026,2028 --apply
 *
 * `--office` is `all` (default), `president`, `senate`, or `house`.
 * Uses CANDATE_TABLE_NAME, AWS_REGION, and the default credential chain.
 */
import { consolidateSamePersonDuplicates } from "../src/lib/data/consolidate";
import { createDynamoRepository } from "../src/lib/data/repository";
import type { FederalOffice } from "../src/lib/types";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const cycleFlag = args.indexOf("--cycle");
const cycles =
  cycleFlag >= 0 && args[cycleFlag + 1]
    ? args[cycleFlag + 1]!.split(",").map((value) => Number(value.trim())).filter((year) => Number.isInteger(year))
    : [2024, 2026, 2028];

const officeFlag = args.indexOf("--office");
const officeArg = officeFlag >= 0 ? args[officeFlag + 1] : "all";
const office = officeArg === "president" || officeArg === "senate" || officeArg === "house" || officeArg === "all"
  ? officeArg
  : "all";

const result = await consolidateSamePersonDuplicates(
  createDynamoRepository(),
  cycles,
  { apply, office: office as FederalOffice | "all" },
);

console.log(
  JSON.stringify(
    {
      dryRun: result.dryRun,
      cycles,
      groups: result.plans.length,
      copiedFilings: result.copiedFilings,
      plans: result.plans,
    },
    null,
    2,
  ),
);
