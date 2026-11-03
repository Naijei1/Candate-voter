import { MemoryVoterRepository } from "../src/lib/data/memory-repository";
import { createDynamoRepository, type VoterRepository } from "../src/lib/data/repository";
import { kyBallotSeed } from "../src/lib/site/ky-ballot";

/**
 * Write the checked November 3, 2026 Kentucky federal ballot into DynamoDB.
 * It upserts race and candidate rows. It does not delete primary filers and
 * it does not invent Form 2 filings.
 *
 * Preview, no AWS calls:
 *   npm run seed:ky -- --dry-run
 *
 * From a machine with credentials that can UpdateItem on the table
 * (account 402275401617, us-east-1):
 *   AWS_REGION=us-east-1 CANDATE_TABLE_NAME=candate-voter npm run seed:ky
 */

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const repo: VoterRepository = dryRun ? new MemoryVoterRepository() : createDynamoRepository();
  const { races, candidates } = kyBallotSeed();
  for (const race of races) await repo.upsertRace(race);
  const keptNewer: string[] = [];
  for (const candidate of candidates) {
    const result = await repo.upsertCandidate(candidate);
    if (result === "kept-newer") keptNewer.push(candidate.candidateId);
  }
  const check = await repo.listCandidatesForRace("2026-senate-KY");
  console.log(
    JSON.stringify(
      {
        dryRun,
        table: process.env.CANDATE_TABLE_NAME?.trim() || "candate-voter",
        races: races.length,
        candidates: candidates.length,
        keptNewer,
        senateReadBack: check.map((candidate) => candidate.displayName).sort(),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "Error";
  console.error(`seed failed: ${name}`);
  process.exitCode = 1;
});
