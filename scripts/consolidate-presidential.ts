/**
 * Collapse duplicate presidential filers that share a normalized name.
 *
 * Dry run (default) prints the plan. `--apply` copies each duplicate's
 * filings onto the keeper id and marks the extra row superseded. Superseded
 * rows stay in DynamoDB; list reads skip them. The table role has no
 * DeleteItem permission.
 *
 *   npx tsx scripts/consolidate-presidential.ts --cycle 2028
 *   npx tsx scripts/consolidate-presidential.ts --cycle 2028 --apply
 *
 * Uses CANDATE_TABLE_NAME, AWS_REGION, and the default credential chain.
 */
import { consolidatePresidentialDuplicates } from "../src/lib/data/consolidate";
import { createDynamoRepository } from "../src/lib/data/repository";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const cycleFlag = args.indexOf("--cycle");
const cycles =
  cycleFlag >= 0 && args[cycleFlag + 1]
    ? args[cycleFlag + 1]!.split(",").map((value) => Number(value.trim())).filter((year) => Number.isInteger(year))
    : [2024, 2026, 2028];

const result = await consolidatePresidentialDuplicates(
  createDynamoRepository(),
  cycles,
  { apply },
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
