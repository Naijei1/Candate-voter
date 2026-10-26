// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { type ReactNode } from "react";

/**
 * Collapses an existing multi-id note and its links.
 * `count` is the keeper plus alternate FEC ids already on the row.
 */
export function MultiFilingDetails({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  if (count < 2) {
    return <div className="mt-1 space-y-1 text-sm leading-6 text-muted">{children}</div>;
  }
  return (
    <details data-testid="multi-filing" className="mt-1 text-sm leading-6 text-muted">
      <summary className="cursor-pointer font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {count} filings
      </summary>
      <div className="mt-1 space-y-1">{children}</div>
    </details>
  );
}
