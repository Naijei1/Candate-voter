import type { Follow } from "../users/follows";

export const ALERT_FOLLOW_LIMIT = 100;
export const MUTED_FILTER = JSON.stringify({ follow: ["disabled"] });

export function followFilter(follows: Pick<Follow, "targetType" | "targetId">[]): string {
  const values = [...new Set(follows.flatMap(({ targetType, targetId }) =>
    targetType === "candidate" || targetType === "race" ? [`${targetType}:${targetId}`] : [],
  ))].sort().slice(0, ALERT_FOLLOW_LIMIT);
  return values.length ? JSON.stringify({ follow: values }) : MUTED_FILTER;
}
