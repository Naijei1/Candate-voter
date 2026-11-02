export type CheckTarget = "race" | "candidate";

export type RecordCheck = {
  targetType: CheckTarget;
  targetId: string;
  checkedAt: string;
  note: string | null;
  by: string;
};

export function parseCheckTarget(value: unknown): CheckTarget | null {
  if (value === "race" || value === "candidate") return value;
  return null;
}

export function parseCheckId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,80}$/.test(text)) return null;
  return text;
}

export function parseCheckNote(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 280) return null;
  return text;
}

export function checkPartition(targetType: CheckTarget, targetId: string): string {
  return `CHECK#${targetType}#${targetId}`;
}
