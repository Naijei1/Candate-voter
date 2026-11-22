export type FollowType = "race" | "candidate" | "jurisdiction" | "measure" | "issue";

export type Follow = {
  userId: string;
  targetType: FollowType;
  targetId: string;
  createdAt: string;
};

export const FOLLOW_LIMIT = 100;
export const FOLLOW_LIMIT_MESSAGE = `You can follow up to ${FOLLOW_LIMIT} races and candidates.`;

export function isAlertFollow(type: FollowType): boolean {
  return type === "race" || type === "candidate";
}

export function followSortKey(type: FollowType, id: string): string {
  return `FOLLOW#${type}#${id}`;
}

export function userPartition(userId: string): string {
  return `USER#${userId}`;
}

export function parseFollowType(value: unknown): FollowType | null {
  if (value === "race" || value === "candidate" || value === "jurisdiction" || value === "measure" || value === "issue") {
    return value;
  }
  return null;
}

export function parseFollowId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/.test(text)) return null;
  return text;
}
