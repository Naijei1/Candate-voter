export type ElectionStage = "primary" | "general" | "special" | "runoff";

const FROM_DESCRIPTION: Record<string, ElectionStage> = {
  primary: "primary",
  general: "general",
  special: "special",
  runoff: "runoff",
};

/**
 * Use only the words FEC puts in `primary_general_indicator_description`.
 * A bare code is not translated here.
 */
export function electionStageFromFec(
  description: string | null | undefined,
): { stage: ElectionStage; label: string } | null {
  const text = description?.trim() ?? "";
  if (!text) return null;
  const stage = FROM_DESCRIPTION[text.toLowerCase()];
  if (!stage) return null;
  return { stage, label: text };
}
