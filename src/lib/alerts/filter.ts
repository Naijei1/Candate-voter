import { isAlertFollow, type Follow } from "../users/follows";

export const MUTED_FILTER = JSON.stringify({ follow: ["disabled"] });

export function followFilter(follows: Pick<Follow, "targetType" | "targetId">[]): string {
  const values = [...new Set(follows.flatMap(({ targetType, targetId }) =>
    isAlertFollow(targetType) ? [`${targetType}:${targetId}`] : [],
  ))].sort();
  return values.length ? JSON.stringify({ follow: values }) : MUTED_FILTER;
}
