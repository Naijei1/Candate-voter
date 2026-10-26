"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { basePathFromEnv } from "@/lib/base-path";
import { instantDateTime } from "@/lib/format";
import { citationLink, formatAsOf } from "@/lib/chat/ui";
import type { ChatSource } from "@/lib/chat/types";

export function CitationCard({ source }: { source: ChatSource }) {
  const origin = useClientOrigin();
  const link = citationLink(source.url, { origin, basePath: basePathFromEnv() });
  const dateTime = instantDateTime(source.as_of);
  const freshness = formatAsOf(source.as_of);

  return (
    <li className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
      <p className="font-semibold text-ink">{source.title}</p>
      {link ? (
        link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {source.url}
            <span className="ml-2 text-xs font-medium tracking-wide text-muted uppercase">External</span>
          </a>
        ) : (
          <Link
            href={link.href}
            className="mt-1 block break-all text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {source.url}
          </Link>
        )
      ) : (
        <p className="mt-1 break-all text-muted">{source.url}</p>
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
