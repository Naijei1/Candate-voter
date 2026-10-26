// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";
import { formatInstant, instantDateTime } from "@/lib/format";

/**
 * One page-level stamp from top-level `refreshedAt`.
 * Missing or blank values render nothing.
 */
export function DataRefreshedBanner({ refreshedAt }: { refreshedAt?: string | null }) {
  const text = formatInstant(refreshedAt);
  if (!text) return null;
  const dateTime = instantDateTime(refreshedAt);
  return (
    <p
      data-testid="data-refreshed"
      className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-muted"
    >
      Data refreshed {dateTime ? <time dateTime={dateTime}>{text}</time> : text}
    </p>
  );
}
