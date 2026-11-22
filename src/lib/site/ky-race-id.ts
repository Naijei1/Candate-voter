import { isFederalRaceIdFor, stateConfig } from "@/lib/states";

export function isKentuckyFederalRaceId(raceId: string): boolean {
  return isFederalRaceIdFor(stateConfig("KY"), raceId);
}
