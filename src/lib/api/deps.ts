import {
  createDynamoRepository,
  type VoterRepository,
} from "../data/repository";
import { readRacePartition, readWatermark } from "../data/read";
import type { ZipDistrictHit } from "../geo/zip-districts";

export type ApiRepository = Pick<
  VoterRepository,
  | "listRacesByCycle"
  | "getRace"
  | "listCandidatesForRace"
  | "getCandidate"
  | "listFilingsForCandidate"
  | "getWatermark"
>;

export type ApiDeps = {
  env: Record<string, string | undefined>;
  /** Clock for the default cycle window. Defaults to the current time. */
  now?: Date;
  repository: () => ApiRepository;
  /**
   * ZIP → state and House districts. Defaults to the Census TIGERweb lookup.
   * Tests pass a fake so they do not call Census.
   */
  lookupZip?: (zip: string) => Promise<ZipDistrictHit | null>;
};

export function liveApiDeps(
  env: Record<string, string | undefined> = process.env,
): ApiDeps {
  return {
    env,
    repository: () => {
      const repo = createDynamoRepository();
      return {
        listRacesByCycle: readRacePartition,
        getRace: repo.getRace.bind(repo),
        listCandidatesForRace: repo.listCandidatesForRace.bind(repo),
        getCandidate: repo.getCandidate.bind(repo),
        listFilingsForCandidate: repo.listFilingsForCandidate.bind(repo),
        getWatermark: readWatermark,
      };
    },
  };
}
