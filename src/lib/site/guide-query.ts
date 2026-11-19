import type { GuideRace } from "@/components/guide/GuideFlow";

export function parseGuideQuery(
  params: Pick<URLSearchParams, "get">,
  races: readonly Pick<GuideRace, "id" | "district">[],
) {
  const requestedRace = params.get("race");
  const race = races.find(({ id }) => id === requestedRace);
  const step = requestedRace !== null && !race
    ? "zip"
    : params.get("step") || (race ? "race" : "zip");

  return {
    step,
    zipParam: params.get("zip") ?? "",
    district: race?.district ?? params.get("district"),
    raceParam: race?.id ?? null,
  };
}
