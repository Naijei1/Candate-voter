import {
  createDynamoRepository,
  type VoterRepository,
} from "../data/repository";

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
};

export function liveApiDeps(
  env: Record<string, string | undefined> = process.env,
): ApiDeps {
  return {
    env,
    repository: () => createDynamoRepository(),
  };
}
