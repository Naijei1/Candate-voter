export type FollowType = "race" | "candidate" | "jurisdiction" | "measure" | "issue";

export type AlertDelivery = "immediate" | "daily" | "weekly";

export type AlertCategory =
  | "filings"
  | "ballot"
  | "statements"
  | "polls"
  | "debates"
  | "deadlines"
  | "finance-receipts"
  | "finance-disbursements"
  | "finance-cash"
  | "finance-debts"
  | "finance-outside";

export const ALERT_CATEGORIES: readonly AlertCategory[] = [
  "filings",
  "ballot",
  "statements",
  "polls",
  "debates",
  "deadlines",
  "finance-receipts",
  "finance-disbursements",
  "finance-cash",
  "finance-debts",
  "finance-outside",
];

export const FINANCE_ALERT_CATEGORIES = [
  "finance-receipts",
  "finance-disbursements",
  "finance-cash",
  "finance-debts",
  "finance-outside",
] as const satisfies readonly AlertCategory[];

/** SES is not configured. Nothing is sent. */
export const ALERT_DELIVERY_STATUS = "planned" as const;

export type AlertPreferences = {
  categories: AlertCategory[];
  delivery: AlertDelivery;
  quietStart: string | null;
  quietEnd: string | null;
  deliveryStatus: typeof ALERT_DELIVERY_STATUS;
};

export type Follow = {
  userId: string;
  targetType: FollowType;
  targetId: string;
  createdAt: string;
};

/**
 * One detected event. `eventAt` is when it happened.
 * `detectedAt` is when this system noticed it. Dedupe uses the event, not detection.
 */
export type AlertNotice = {
  userId: string;
  category: AlertCategory;
  targetType: FollowType;
  targetId: string;
  eventAt: string;
  detectedAt: string;
  dedupeKey: string;
};

/** `eventAt` is the coverage end or filing date. `detectedAt` is when this system noticed it. */
export function financeAlertNotice(input: {
  userId: string;
  category: (typeof FINANCE_ALERT_CATEGORIES)[number];
  targetType: FollowType;
  targetId: string;
  eventAt: string;
  detectedAt: string;
}): AlertNotice {
  return {
    userId: input.userId,
    category: input.category,
    targetType: input.targetType,
    targetId: input.targetId,
    eventAt: input.eventAt,
    detectedAt: input.detectedAt,
    dedupeKey: alertDedupeKey(input),
  };
}

export function alertDedupeKey(input: {
  category: string;
  targetType: string;
  targetId: string;
  eventAt: string;
}): string {
  return `${input.category}#${input.targetType}#${input.targetId}#${input.eventAt}`;
}

export function dedupeNotices(notices: readonly AlertNotice[]): AlertNotice[] {
  const seen = new Set<string>();
  const kept: AlertNotice[] = [];
  for (const notice of notices) {
    const key = `${notice.userId}#${notice.dedupeKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(notice);
  }
  return kept;
}

export function followSortKey(type: FollowType, id: string): string {
  return `FOLLOW#${type}#${id}`;
}

export function userPartition(userId: string): string {
  return `USER#${userId}`;
}

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Both empty means no quiet hours. A partial or invalid pair is rejected. */
export function parseQuietHours(
  start: unknown,
  end: unknown,
): { ok: true; value: { start: string; end: string } | null } | { ok: false } {
  const blank = (value: unknown) => value == null || value === "";
  if (blank(start) && blank(end)) return { ok: true, value: null };
  if (typeof start !== "string" || typeof end !== "string") return { ok: false };
  if (!HOUR.test(start) || !HOUR.test(end)) return { ok: false };
  return { ok: true, value: { start, end } };
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
