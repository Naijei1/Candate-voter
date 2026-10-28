"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { basePathFromEnv } from "@/lib/base-path";
import { instantDateTime } from "@/lib/format";
import { citationAsOf, citationLabel, citationLink } from "@/lib/chat/ui";
import type { ChatSource } from "@/lib/chat/types";

export function CitationCard({
  source,
  refreshedAt = null,
}: {
  source: ChatSource;
  /** Page cursor time from the same answer, used only when `as_of` is unknown. */
  refreshedAt?: string | null;
}) {
  const origin = useClientOrigin();
  const link = citationLink(source.url, { origin, basePath: basePathFromEnv() });
  const freshness = citationAsOf(source.as_of, refreshedAt);
  const shown = source.as_of.trim().toLowerCase() === "unknown" ? (refreshedAt ?? source.as_of) : source.as_of;
  const dateTime = instantDateTime(shown);
  const label = citationLabel(source);

  const text = (
    <>
      {label}
      {link?.external ? (
        <span className="ml-2 text-xs font-medium tracking-wide text-muted uppercase">External</span>
      ) : null}
    </>
  );

  return (
    <li className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
      {link ? (
        link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {text}
          </a>
        ) : (
          <Link
            href={link.href}
            className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {text}
          </Link>
        )
      ) : (
        <p className="font-semibold text-ink">{label}</p>
      )}
      <p className="mt-1 text-xs text-muted">
        {dateTime ? <time dateTime={dateTime}>{freshness}</time> : freshness}
      </p>
    </li>
  );
}

function useClientOrigin(): string | undefined {
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
